// =================================================================
// barDataStore.ts — Supabase bar_data 永続化モジュール
//
// 設計方針（Console Gateway）:
//   自動同期 OFF — ユーザーが Console で手動ボタンを押した時のみ同期
//   差分同期 — 前回保存以降の新しいバーのみをUPSERT
//   ブローカーsuffix正規化 — GOLD# → GOLD（#以降を除去）
// =================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

const BATCH_SIZE = parseInt(process.env.SUPABASE_BATCH_SIZE ?? "500", 10);
const BATCH_DELAY_MS = parseInt(process.env.SUPABASE_BATCH_DELAY_MS ?? "50", 10);

let _client: SupabaseClient | null = null;
let _initialized = false;
let _enabled = false;

function getClient(): SupabaseClient | null {
  if (_initialized) return _enabled ? _client : null;
  _initialized = true;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn("[barData] SUPABASE_URL / SUPABASE_SERVICE_KEY 未設定 → 手動同期も無効");
    return null;
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    realtime: { transport: ws as any },
  });
  _enabled = true;
  console.log("[barData] Supabase接続準備完了 → 手動同期ボタンで保存します");
  return _client;
}

export interface BarRecord {
  time:   number; // UTC ミリ秒
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

interface BarRow {
  symbol:    string;
  timeframe: string;
  time_utc:  string;
  open:      number;
  high:      number;
  low:       number;
  close:     number;
  volume:    number;
}

/** ブローカーsuffix除去: "GOLD#" → "GOLD", "EURUSD.r" → "EURUSD" */
function normalizeSymbol(symbol: string): string {
  return symbol.replace(/[#.].*$/, "").toUpperCase();
}

function toRow(symbol: string, timeframe: string, bar: BarRecord): BarRow {
  return {
    symbol:    normalizeSymbol(symbol),
    timeframe: timeframe.toUpperCase(),
    time_utc:  new Date(bar.time).toISOString(),
    open:      bar.open,
    high:      bar.high,
    low:       bar.low,
    close:     bar.close,
    volume:    bar.volume ?? 0,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ------------------------------------------------------------------
// 差分同期 — Supabaseに存在しない新しいバーのみUPSERT
// ------------------------------------------------------------------

export interface SyncResult {
  total:    number;
  byKey:    Record<string, number>;
  skipped:  number;
  duration: number;
}

/**
 * 手動同期: Gateway memory → Supabase（差分のみ）
 *
 * 手順:
 *   1. Supabaseから symbol×TFごとの最新 time_utc を取得
 *   2. barStore内で最新time_utcより新しいバーだけを抽出
 *   3. バッチUPSERT
 */
export async function upsertIncrementalBars(
  barStore: Map<string, BarRecord[]>
): Promise<SyncResult> {
  const db = getClient();
  if (!db) return { total: 0, byKey: {}, skipped: 0, duration: 0 };

  const startMs = Date.now();

  // 1. Supabase の最新タイムスタンプを取得
  const latestInSupabase = new Map<string, number>(); // "GOLD:M5" → ms
  try {
    const { data } = await db.rpc("get_bar_data_status");
    if (Array.isArray(data)) {
      for (const row of data as { symbol: string; timeframe: string; newest_bar: string }[]) {
        const key = `${row.symbol.toUpperCase()}:${row.timeframe.toUpperCase()}`;
        latestInSupabase.set(key, new Date(row.newest_bar).getTime());
      }
      console.log(`[barData] Supabase既存: ${latestInSupabase.size}シンボル×TF`);
    }
  } catch (e) {
    console.warn("[barData] get_bar_data_status failed:", e);
  }

  let total = 0;
  let skipped = 0;
  const byKey: Record<string, number> = {};

  // 2. barStore の各キーで差分抽出 & UPSERT
  for (const [rawKey, bars] of barStore.entries()) {
    if (bars.length === 0) continue;

    const [rawSymbol, timeframe] = rawKey.split(":");
    const normalizedSymbol = normalizeSymbol(rawSymbol);
    const normalizedKey = `${normalizedSymbol}:${timeframe}`;

    const latestMs = latestInSupabase.get(normalizedKey) ?? 0;

    // 最新time_utc より新しいバーだけ
    const newBars = bars.filter(b => b.time > latestMs);

    if (newBars.length === 0) {
      skipped++;
      continue;
    }

    const rows = newBars.map(b => toRow(rawSymbol, timeframe, b));

    // バッチUPSERT
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await db
        .from("bar_data")
        .upsert(batch, { onConflict: "symbol,timeframe,time_utc", ignoreDuplicates: false });
      if (error) {
        console.warn(`[barData] upsert error ${normalizedKey}:`, error.message);
      }
      if (i + BATCH_SIZE < rows.length) await sleep(BATCH_DELAY_MS);
    }

    total += newBars.length;
    byKey[normalizedKey] = newBars.length;
    console.log(`[barData] ${normalizedKey}: ${newBars.length}本 追加 (全${bars.length}本中)`);
  }

  const duration = Math.round((Date.now() - startMs) / 1000);
  console.log(`[barData] 差分同期完了: ${total}本追加 / ${skipped}TFスキップ / ${duration}秒`);
  return { total, byKey, skipped, duration };
}

// ------------------------------------------------------------------
// フル同期（起動時の初期化用のみ — 通常は使わない）
// ------------------------------------------------------------------

export async function syncBarStoreToSupabase(
  barStore: Map<string, BarRecord[]>
): Promise<void> {
  const db = getClient();
  if (!db) return;

  console.log("[barData] フル同期開始 ...");
  let totalSaved = 0;

  for (const [key, bars] of barStore.entries()) {
    if (bars.length === 0) continue;
    const [symbol, timeframe] = key.split(":");
    if (!symbol || !timeframe) continue;

    const rows = bars.map(b => toRow(symbol, timeframe, b));
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await db.from("bar_data").upsert(batch, {
        onConflict: "symbol,timeframe,time_utc",
        ignoreDuplicates: true,
      });
      if (error) console.warn(`[barData] sync error ${key}:`, error.message);
      else totalSaved += batch.length;
      await sleep(BATCH_DELAY_MS);
    }
  }
  console.log(`[barData] フル同期完了: ${totalSaved}本`);
}

// 個別upsert（後方互換 — 自動同期OFFなので呼ばれない想定）
export async function upsertBulkBars(
  symbol: string, timeframe: string, bars: BarRecord[]
): Promise<void> {
  // 手動同期モードでは何もしない
  void symbol; void timeframe; void bars;
}

export async function upsertSingleBar(
  symbol: string, timeframe: string, bar: BarRecord
): Promise<void> {
  // 手動同期モードでは何もしない
  void symbol; void timeframe; void bar;
}

export function isEnabled(): boolean {
  return getClient() !== null;
}
