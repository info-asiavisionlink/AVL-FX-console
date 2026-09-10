// =================================================================
// AVL Console Gateway v1.0 — Market Data Ingestion Only
// =================================================================
//
// 責務:
//   Admin MT5 DataManager → Console Gateway → Supabase bar_data
//
// ⚠️ NO TRADE EXECUTION ⚠️
//   このGatewayは取引注文を処理しません。
//   BUY / SELL / CLOSE / MODIFY は一切受け付けません。
//
// エンドポイント (EA → Server)
//   POST /connect          DataManager起動通知
//   POST /tick             Tick受信
//   POST /bar              リアルタイムBar受信
//   POST /bars/bulk        過去Bar一括受信
//   POST /positions        ポジション受信 (read-only for admin monitoring)
//   POST /account          口座情報受信 (read-only for admin monitoring)
//   POST /heartbeat        死活監視
//   POST /event            切断通知
//   POST /symbols/bulk     Market Watch全シンボル受信
//   POST /indicators       インジケーター受信
//   POST /history/bulk     取引履歴受信
//   POST /orders/stream    注文一覧受信 (monitoring only)
//
// エンドポイント (Admin Console → Server, read-only)
//   GET /health            サーバー状態
//   GET /bars/:sym/:tf     過去Bar取得
//   GET /tick/:sym         最新Tick
//   GET /positions         ポジション一覧
//   GET /account           口座情報
//   GET /symbols           シンボル一覧
//   GET /indicators/:sym   インジケーター
//   GET /history/:symbol   取引履歴
//   GET /market-data/status  データステータス
//   GET /debug/bar-timestamps タイムスタンプ診断
//
// Sync Job (Data Phase B)
//   GET /data-commands/pending   EA→Sync Job取得
//   POST /data-commands/:id/progress  進捗更新
//
// 管理エンドポイント
//   DELETE /admin/bars/:sym/:tf  barStoreクリア
//   POST /admin/sync-to-supabase  手動Supabase同期
//
// WebSocket /ws (read-only stream to Admin Console)
//
// 起動: cd gateway && npm run dev
// =================================================================

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import fs   from "fs";
import path from "path";
import {
  upsertBulkBars,
  upsertSingleBar,
  syncBarStoreToSupabase,
  isEnabled as isSupabaseEnabled,
  type BarRecord,
} from "./barDataStore";
import {
  claimNextSyncJob,
  updateSyncJobProgress,
  SUPPORTED_TIMEFRAMES,
  SYNC_JOB_STALE_MS,
} from "./syncJobStore";

void SYNC_JOB_STALE_MS;

// -----------------------------------------------------------------
// 型定義
// -----------------------------------------------------------------

interface Bar {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

interface Tick {
  symbol: string;
  bid:    number;
  ask:    number;
  spread: number;
  digits: number;
  time:   number;
}

interface Position {
  ticket:       number;
  type:         number;
  volume:       number;
  openPrice:    number;
  currentPrice: number;
  sl:           number;
  tp:           number;
  profit:       number;
  swap:         number;
  openTime:     number;
  magic:        number;
}

interface Account {
  login:       number;
  broker:      string;
  currency:    string;
  balance:     number;
  equity:      number;
  margin:      number;
  freeMargin:  number;
  marginLevel: number;
  leverage:    number;
}

interface MarketWatchSymbol {
  symbol:       string;
  bid:          number;
  ask:          number;
  spread:       number;
  changePct:    number;
  digits:       number;
  point:        number;
  contractSize: number;
  tickValue:    number;
  tickSize:     number;
  high52:       number;
  low52:        number;
  prevClose:    number;
  time:         number;
  receivedAt:   number;
}

interface Order {
  ticket:       number;
  symbol:       string;
  type:         number;
  orderType:    "pending" | "position";
  volume:       number;
  openPrice:    number;
  currentPrice?: number;
  sl:           number;
  tp:           number;
  profit:       number;
  swap:         number;
  commission:   number;
  openTime:     number;
  magic:        number;
  comment:      string;
}

interface TFIndicator {
  ema21:      number;
  ema200:     number;
  sma50:      number;
  atr:        number;
  rsi:        number;
  macd:       number;
  macdSignal: number;
  macdHist:   number;
  adx:        number;
  diPlus:     number;
  diMinus:    number;
  bbUpper:    number;
  bbMid:      number;
  bbLower:    number;
  bbWidth:    number;
  trend:      "UP" | "DOWN" | "FLAT";
}

interface HistoryDeal {
  ticket:      number;
  symbol:      string;
  type:        number;
  volume:      number;
  closeTime:   number;
  closePrice:  number;
  profit:      number;
  swap:        number;
  commission:  number;
  magic:       number;
  receivedAt?: number;
}

interface Indicators {
  symbol:     string;
  spread:     number;
  digits:     number;
  brokerTime: number;
  timeframes: Record<string, TFIndicator>;
  receivedAt: number;
  sessions?:  string[];
}

function getTradingSessions(brokerTimeSec: number): string[] {
  const d    = new Date(brokerTimeSec * 1000);
  const hour = d.getUTCHours();
  const min  = d.getUTCMinutes();
  const t    = hour + min / 60;
  const sess: string[] = [];
  if (t >= 22 || t < 7)  sess.push("Wellington/Sydney");
  if (t >= 0  && t < 9)  sess.push("Tokyo");
  if (t >= 7  && t < 16) sess.push("London");
  if (t >= 12 && t < 21) sess.push("New York");
  return sess.length > 0 ? sess : ["Market Closed"];
}

interface WsMessage {
  type:       string;
  symbol?:    string;
  timeframe?: string;
  data?:      unknown;
  ts:         number;
}

// -----------------------------------------------------------------
// Express + HTTP サーバー
// -----------------------------------------------------------------

const app    = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// -----------------------------------------------------------------
// バーストア永続化
// -----------------------------------------------------------------

const PERSIST_FILE = path.join(process.cwd(), "data", "bars.json");

function persistSave(): void {
  try {
    fs.mkdirSync(path.dirname(PERSIST_FILE), { recursive: true });
    const obj: Record<string, Bar[]> = {};
    barStore.forEach((bars, key) => { obj[key] = bars; });
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(obj));
  } catch (e) {
    console.warn("[Persist] 保存失敗:", e);
  }
}

function persistLoad(): void {
  try {
    if (!fs.existsSync(PERSIST_FILE)) return;
    const obj = JSON.parse(fs.readFileSync(PERSIST_FILE, "utf8")) as Record<string, Bar[]>;
    let total = 0;
    for (const [key, bars] of Object.entries(obj)) {
      barStore.set(key, bars);
      total += bars.length;
    }
    console.log(`[Persist] 復元: ${Object.keys(obj).length}キー, ${total}本`);
  } catch (e) {
    console.warn("[Persist] 読み込み失敗:", e);
  }
}

setInterval(persistSave, 30_000);

// -----------------------------------------------------------------
// インメモリストア
// -----------------------------------------------------------------

const MAX_BARS = 10_000;

const barStore       = new Map<string, Bar[]>();
const tickStore      = new Map<string, Tick>();
let   positions:     Position[] = [];
let   account:       Account | null = null;
let   eaInfo:        Record<string, unknown> | null = null;
const indicatorStore = new Map<string, Indicators>();
const historyStore   = new Map<string, Map<number, HistoryDeal>>();
const symbolStore    = new Map<string, MarketWatchSymbol>();
const orderStore     = new Map<number, Order>();

let lastTickTs:      number = 0;
let lastSymbolTs:    number = 0;
let lastIndicatorTs: number = 0;

const heartbeatStore = new Map<string, string>();

// -----------------------------------------------------------------
// WebSocket /ws
// -----------------------------------------------------------------

const wss     = new WebSocketServer({ server, path: "/ws" });
const clients = new Set<WebSocket>();

wss.on("connection", (ws, req) => {
  clients.add(ws);
  console.log(`[WS] 接続 ${req.socket.remoteAddress} (計${clients.size})`);

  if (eaInfo)    safeSend(ws, { type: "EA_CONNECTED", data: eaInfo,  ts: Date.now() });
  if (account)   safeSend(ws, { type: "ACCOUNT",      data: account, ts: Date.now() });
  if (symbolStore.size > 0) {
    safeSend(ws, { type: "SYMBOLS", data: Array.from(symbolStore.values()), ts: Date.now() });
  }

  ws.on("close", () => { clients.delete(ws); });
  ws.on("error", () => { clients.delete(ws); });
});

function safeSend(ws: WebSocket, msg: WsMessage): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(msg: WsMessage): void {
  const str = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(str);
  }
}

// -----------------------------------------------------------------
// 認証ミドルウェア (EA → Server)
// -----------------------------------------------------------------

const SECRET = process.env.CONSOLE_GATEWAY_SECRET ?? process.env.MT5_GATEWAY_SECRET ?? "";

function auth(req: Request, res: Response, next: NextFunction): void {
  if (!SECRET) { res.status(401).json({ error: "Unauthorized: SECRET not configured" }); return; }
  const bearer  = (req.headers.authorization ?? "").replace("Bearer ", "").trim();
  const xSecret = (req.headers["x-gateway-secret"] ?? "") as string;
  const token   = bearer || xSecret;
  if (token !== SECRET) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

// -----------------------------------------------------------------
// EA → Server: 受信エンドポイント (データ受信のみ / 注文なし)
// -----------------------------------------------------------------

app.post("/connect", auth, (req, res) => {
  eaInfo = req.body as Record<string, unknown>;
  const { symbol, login, broker, serverTime } = eaInfo as Record<string, unknown>;
  console.log(`[EA] 接続: symbol=${symbol} login=${login} broker=${broker} serverTime=${serverTime}`);
  broadcast({ type: "EA_CONNECTED", data: eaInfo, ts: Date.now() });
  res.json({ ok: true });
});

app.post("/event", auth, (req, res) => {
  const { type, symbol } = req.body as { type: string; symbol: string };
  if (type === "DISCONNECT") {
    eaInfo = null;
    console.log(`[EA] 切断: ${symbol}`);
  }
  broadcast({ type, symbol, ts: Date.now() });
  res.json({ ok: true });
});

app.post("/tick", auth, (req, res) => {
  const tick = req.body as Tick;
  tickStore.set(tick.symbol, tick);
  lastTickTs = Date.now();
  broadcast({ type: "TICK", symbol: tick.symbol, data: tick, ts: Date.now() });
  res.json({ ok: true });
});

app.post("/bar", auth, (req, res) => {
  const bar = req.body as Bar & { symbol: string; timeframe: string };
  upsertBar(bar.symbol, bar.timeframe, bar);
  broadcast({ type: "BAR", symbol: bar.symbol, timeframe: bar.timeframe, data: bar, ts: Date.now() });
  res.json({ ok: true });
});

app.post("/bars/bulk", auth, (req, res) => {
  const { symbol, timeframe, bars } = req.body as {
    symbol: string; timeframe: string; bars: Bar[];
  };
  if (!symbol || !timeframe || !Array.isArray(bars)) {
    res.status(400).json({ error: "symbol / timeframe / bars が必要です" });
    return;
  }
  const key      = storeKey(symbol, timeframe);
  const existing = barStore.get(key);
  const normalized = bars.map(normalizeBar);

  const tick = tickStore.get(symbol.toUpperCase());
  if (tick && normalized.length > 0) {
    const sorted0  = dedupAndSort(normalized);
    const lastBulkMs = sorted0[sorted0.length - 1].time;
    const tickMs   = normalizeTime(tick.time);
    const diffSec  = (lastBulkMs - tickMs) / 1000;
    if (diffSec > 3600) {
      console.warn(`[Bulk] ${key} TZ不整合スキップ: bulk末尾=${lastBulkMs} tick=${tickMs} diff=${Math.floor(diffSec/60)}分`);
      res.json({ ok: true, skipped: "tz_mismatch" });
      return;
    }
  }

  if (!existing || bars.length >= existing.length) {
    const sorted = dedupAndSort(normalized);
    barStore.set(key, sorted.slice(-MAX_BARS));
    console.log(`[Bulk] ${key}: ${sorted.length}本`);
    persistSave();
  }

  if (normalized.length > 0) {
    upsertBulkBars(symbol, timeframe, normalized as BarRecord[]).catch((err: unknown) => {
      console.warn(`[barData] bulk upsert failed ${key}:`, err);
    });
  }

  res.json({ ok: true });
});

app.post("/positions", auth, (req, res) => {
  const { positions: pos, symbol } = req.body as { positions: Position[]; symbol: string };
  positions = pos ?? [];
  broadcast({ type: "POSITIONS", symbol, data: positions, ts: Date.now() });
  res.json({ ok: true });
});

app.post("/account", auth, (req, res) => {
  account = req.body as Account;
  broadcast({ type: "ACCOUNT", data: account, ts: Date.now() });
  res.json({ ok: true });
});

app.post("/heartbeat", auth, (req, res) => {
  const body = req.body as { symbol?: string; serverTime?: number };
  if (body.symbol) {
    heartbeatStore.set(body.symbol.toUpperCase(), new Date().toISOString());
  }
  broadcast({ type: "HEARTBEAT", data: req.body, ts: Date.now() });
  res.json({ ok: true });
});

app.post("/symbols/bulk", auth, (req, res) => {
  const body = req.body as { count?: number; symbols?: MarketWatchSymbol[] };
  if (!Array.isArray(body.symbols)) { res.status(400).json({ error: "symbols が必要です" }); return; }

  const now = Date.now();
  let updated = 0;
  for (const sym of body.symbols) {
    if (!sym.symbol) continue;
    symbolStore.set(sym.symbol.toUpperCase(), { ...sym, receivedAt: now });
    updated++;
  }

  lastSymbolTs = now;
  broadcast({ type: "SYMBOLS", data: Array.from(symbolStore.values()), ts: now });
  res.json({ ok: true, updated });
});

app.post("/orders/stream", auth, (req, res) => {
  const body = req.body as { count?: number; orders?: Order[] };
  if (!Array.isArray(body.orders)) { res.status(400).json({ error: "orders が必要です" }); return; }

  orderStore.clear();
  for (const order of body.orders) {
    if (!order.ticket) continue;
    orderStore.set(order.ticket, order);
  }

  broadcast({ type: "ORDERS", data: Array.from(orderStore.values()), ts: Date.now() });
  res.json({ ok: true, count: orderStore.size });
});

app.post("/indicators", auth, (req, res) => {
  const body = req.body as Omit<Indicators, "receivedAt">;
  if (!body.symbol || !body.timeframes) {
    res.status(400).json({ error: "symbol / timeframes が必要です" });
    return;
  }
  const sessions = getTradingSessions(body.brokerTime);
  const data: Indicators = { ...body, receivedAt: Date.now(), sessions };
  indicatorStore.set(body.symbol.toUpperCase(), data);
  lastIndicatorTs = Date.now();
  broadcast({ type: "INDICATORS", symbol: body.symbol, data, ts: Date.now() });
  res.json({ ok: true });
});

app.post("/history/bulk", auth, (req, res) => {
  const body = req.body as { symbol: string; deals: Omit<HistoryDeal, "symbol" | "receivedAt">[] };
  if (!body.symbol || !Array.isArray(body.deals)) {
    res.status(400).json({ error: "symbol / deals が必要です" });
    return;
  }
  const sym = body.symbol.toUpperCase();
  if (!historyStore.has(sym)) historyStore.set(sym, new Map());
  const symMap = historyStore.get(sym)!;

  let added = 0;
  for (const deal of body.deals) {
    if (!symMap.has(deal.ticket)) {
      symMap.set(deal.ticket, { ...deal, symbol: sym, receivedAt: Date.now() });
      added++;
    }
  }
  console.log(`[History] ${sym}: ${added} 件追加 (合計 ${symMap.size} 件)`);
  res.json({ ok: true, added, total: symMap.size });
});

// -----------------------------------------------------------------
// 管理エンドポイント
// -----------------------------------------------------------------

app.delete("/admin/bars/:symbol/:timeframe", (_req, res) => {
  const key = storeKey(_req.params.symbol, _req.params.timeframe);
  barStore.delete(key);
  console.log(`[Admin] ${key} クリア`);
  res.json({ ok: true, key });
});

app.post("/admin/sync-to-supabase", auth, (_req, res) => {
  if (!isSupabaseEnabled()) {
    res.status(503).json({ error: "Supabase 未設定" });
    return;
  }
  syncBarStoreToSupabase(barStore as unknown as Map<string, BarRecord[]>).catch((err: unknown) => {
    console.warn("[barData] sync-to-supabase error:", err);
  });
  res.json({ ok: true, message: "同期をバックグラウンドで開始しました" });
});

// -----------------------------------------------------------------
// Data Phase B — Sync Command API
// -----------------------------------------------------------------

app.get("/data-commands/pending", auth, async (req: Request, res: Response) => {
  const symbol = (req.query["symbol"] as string | undefined)?.toUpperCase() ?? undefined;

  try {
    const job = await claimNextSyncJob(symbol);
    if (!job) { res.json({ jobs: [] }); return; }
    res.json({
      jobs: [{
        id:           job.id,
        symbol:       job.symbol,
        timeframe:    job.timeframe,
        mode:         job.mode,
        target_from:  job.target_from,
        target_to:    job.target_to,
        current_from: job.current_from ?? null,
      }],
    });
  } catch (err) {
    console.warn("[DataSync] /data-commands/pending error:", err);
    res.json({ jobs: [] });
  }
});

app.post("/data-commands/:id/progress", auth, async (req: Request, res: Response) => {
  const jobId = req.params["id"];
  if (!jobId) { res.status(400).json({ error: "id required" }); return; }

  const body = req.body as {
    status?:         string;
    progress_pct?:   number;
    received_bars?:  number;
    sent_bars?:      number;
    failed_batches?: number;
    current_from?:   number;
    current_to?:     number;
    error_message?:  string;
  };

  const validStatuses = ["RUNNING", "COMPLETED", "FAILED"] as const;
  type ValidStatus = typeof validStatuses[number];
  const status = body.status as ValidStatus | undefined;
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: "status must be RUNNING | COMPLETED | FAILED" });
    return;
  }

  const ok = await updateSyncJobProgress(jobId, {
    status,
    progress_pct:   body.progress_pct,
    received_bars:  body.received_bars,
    sent_bars:      body.sent_bars,
    failed_batches: body.failed_batches,
    current_from:   body.current_from  ?? null,
    current_to:     body.current_to    ?? null,
    error_message:  body.error_message ?? null,
  });

  res.json({ ok });
});

void SUPPORTED_TIMEFRAMES;

// -----------------------------------------------------------------
// Browser → Server: 読み取り専用 REST API
// -----------------------------------------------------------------

app.get("/health", (_req, res) => {
  const mem = process.memoryUsage();
  const heartbeats: Record<string, string> = {};
  heartbeatStore.forEach((iso, sym) => { heartbeats[sym] = iso; });
  res.json({
    status:           "ok",
    version:          "1.0",
    role:             "Console Gateway (Data Only)",
    ea:               eaInfo ? { symbol: eaInfo.symbol, login: eaInfo.login, version: eaInfo.version } : null,
    eaConnected:      eaInfo !== null,
    marketWatch:      symbolStore.size,
    tickSymbols:      Array.from(tickStore.keys()),
    barKeys:          Array.from(barStore.keys()),
    indicatorSymbols: Array.from(indicatorStore.keys()),
    clients:          clients.size,
    uptime:           Math.floor(process.uptime()),
    serverTime:       Date.now(),
    lastTickTs,
    lastSymbolTs,
    lastIndicatorTs,
    memoryMB:         Math.round(mem.rss / 1024 / 1024),
    heartbeats,
  });
});

app.get("/symbols", (_req, res) => {
  if (symbolStore.size > 0) {
    res.json(Array.from(symbolStore.values()));
    return;
  }
  const list = Array.from(tickStore.values()).map((t) => ({
    symbol: t.symbol, bid: t.bid, ask: t.ask,
    spread: t.spread, digits: t.digits, time: t.time,
  }));
  res.json(list);
});

app.get("/tick/:symbol", (req, res) => {
  const tick = tickStore.get(req.params.symbol.toUpperCase());
  if (!tick) { res.status(404).json({ error: "symbol not found" }); return; }
  res.json(tick);
});

app.get("/bars/:symbol/:timeframe", (req, res) => {
  const key   = storeKey(req.params.symbol, req.params.timeframe);
  let   bars  = barStore.get(key) ?? [];
  const count = Number(req.query.count ?? 500);
  bars        = dedupAndSort(bars);
  res.json(bars.slice(-count));
});

app.get("/positions", auth, (_req, res) => { res.json(positions); });
app.get("/account",   auth, (_req, res) => {
  if (!account) { res.status(404).json({ error: "no account data" }); return; }
  res.json(account);
});

app.get("/indicators/:symbol", (_req, res) => {
  const ind = indicatorStore.get(_req.params.symbol.toUpperCase());
  if (!ind) { res.status(404).json({ error: "symbol not found" }); return; }
  res.json(ind);
});

app.get("/indicators", (_req, res) => {
  const list: Indicators[] = [];
  indicatorStore.forEach((v) => list.push(v));
  res.json(list);
});

app.get("/history/:symbol", (_req, res) => {
  const sym    = _req.params.symbol.toUpperCase();
  const symMap = historyStore.get(sym);
  if (!symMap || symMap.size === 0) { res.json([]); return; }
  res.json(Array.from(symMap.values()).sort((a, b) => b.closeTime - a.closeTime));
});

app.get("/history", (_req, res) => {
  const list: HistoryDeal[] = [];
  historyStore.forEach((symMap) => symMap.forEach((d) => list.push(d)));
  list.sort((a, b) => b.closeTime - a.closeTime);
  res.json(list);
});

app.get("/market-data/status", (_req, res) => {
  interface StatEntry {
    count: number; from_utc: string | null; to_utc: string | null;
    span_days: number | null; last_updated_ms: number;
  }
  const result: Record<string, StatEntry> = {};
  barStore.forEach((bars, key) => {
    if (bars.length === 0) return;
    const sorted = dedupAndSort(bars);
    const first  = sorted[0];
    const last   = sorted[sorted.length - 1];
    const spanMs = last.time - first.time;
    result[key] = {
      count:           sorted.length,
      from_utc:        first.time ? new Date(first.time).toISOString() : null,
      to_utc:          last.time  ? new Date(last.time).toISOString()  : null,
      span_days:       spanMs > 0 ? Math.round(spanMs / 86_400_000 * 10) / 10 : 0,
      last_updated_ms: Date.now(),
    };
  });
  res.json({
    timestamp:        new Date().toISOString(),
    total_symbol_tf:  Object.keys(result).length,
    max_bars_per_tf:  MAX_BARS,
    supabase_enabled: isSupabaseEnabled(),
    symbols:          result,
  });
});

app.get("/debug/bar-timestamps", (req, res) => {
  const sym = String(req.query.symbol  ?? "EURUSD").toUpperCase();
  const tf  = String(req.query.timeframe ?? "H4").toUpperCase();
  const cnt = Math.min(Number(req.query.count ?? 10), 50);
  const key = storeKey(sym, tf);
  const bars = dedupAndSort(barStore.get(key) ?? []).slice(-cnt);
  const tick = tickStore.get(sym);
  const sample = bars.map(b => ({
    bar_time_ms:  b.time,
    bar_time_utc: new Date(b.time).toISOString(),
    bar_time_sec: Math.round(b.time / 1000),
    mod_300:      Math.round(b.time / 1000) % 300,
    mod_14400:    Math.round(b.time / 1000) % 14400,
    open: b.open, close: b.close,
  }));
  res.json({
    info:          "bar.time は UTC ミリ秒。mod_14400=0 なら H4 は UTC 境界に整列",
    symbol: sym, timeframe: tf, bar_count: bars.length,
    tick_time_ms:  tick ? normalizeTime(tick.time) : null,
    tick_time_utc: tick ? new Date(normalizeTime(tick.time)).toISOString() : null,
    bars: sample,
  });
});

// -----------------------------------------------------------------
// ユーティリティ
// -----------------------------------------------------------------

function storeKey(symbol: string, timeframe: string): string {
  return `${symbol.toUpperCase()}:${timeframe.toUpperCase()}`;
}

function normalizeTime(time: number): number {
  return time < 1_000_000_000_000 ? time * 1000 : time;
}

function normalizeBar(b: Bar): Bar {
  return { ...b, time: normalizeTime(b.time) };
}

function dedupAndSort(bars: Bar[]): Bar[] {
  const map = new Map<number, Bar>();
  for (const b of bars) map.set(b.time, b);
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

function upsertBar(symbol: string, timeframe: string, rawBar: Bar & { symbol?: string; timeframe?: string }): void {
  const key  = storeKey(symbol, timeframe);
  const bars = barStore.get(key) ?? [];
  const last = bars[bars.length - 1];
  const bar  = normalizeBar(rawBar);

  if (last && last.time === bar.time) {
    bars[bars.length - 1] = { time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume };
  } else {
    if (last) {
      upsertSingleBar(symbol, timeframe, last as BarRecord).catch((err: unknown) => {
        console.warn(`[barData] confirmed bar upsert failed ${symbol}:${timeframe}:`, err);
      });
    }
    bars.push({ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume });
    if (bars.length > MAX_BARS) bars.shift();
  }
  barStore.set(key, bars);
}

// -----------------------------------------------------------------
// 起動
// -----------------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? process.env.MT5_WEBSOCKET_PORT ?? "8081", 10);

persistLoad();

server.listen(PORT, "0.0.0.0", () => {
  console.log("==============================================");
  console.log("  AVL Console Gateway v1.0");
  console.log("  [DATA ONLY — NO TRADE EXECUTION]");
  console.log("==============================================");
  console.log(`  HTTP REST : http://0.0.0.0:${PORT}`);
  console.log(`  WebSocket : ws://0.0.0.0:${PORT}/ws`);
  console.log(`  Auth      : ${SECRET ? "✓ 有効" : "⚠ 未設定"}`);
  console.log(`  Supabase  : ${isSupabaseEnabled() ? "✓ bar_data 永続化有効" : "⚠ 未設定"}`);
  console.log("==============================================");

  if (isSupabaseEnabled()) {
    const totalBars = Array.from(barStore.values()).reduce((s, b) => s + b.length, 0);
    if (totalBars > 0) {
      console.log(`[barData] 起動時同期: ${totalBars}本 → Supabase ...`);
      syncBarStoreToSupabase(barStore as unknown as Map<string, BarRecord[]>).catch((err: unknown) => {
        console.warn("[barData] startup sync error:", err);
      });
    }
  }
});

process.on("SIGTERM", () => { persistSave(); server.close(() => process.exit(0)); });
process.on("SIGINT",  () => { persistSave(); server.close(() => process.exit(0)); });
