// =================================================================
// POST /api/research/backtest
//
// Trading View → Console 専用バックテスト API
//
// 認証方法（2系統）:
//   1. X-Backtest-Secret: {CONSOLE_GATEWAY_SECRET}  ← Trading View server→server
//   2. X-Research-Token: {token}                    ← サブスク顧客向け（従来）
//
// データソース: Console Supabase の bar_data（DataManager EA から蓄積）
// エンジン:     Trading View と同じ BacktestEngine を移植
// =================================================================

import { NextRequest, NextResponse }                from "next/server";
import { authenticateResearch, ResearchAuthError, logResearchAccess } from "@/lib/research-auth";
import { getAdminSupabase }                          from "@/lib/admin-auth";
import { StrategySpecSchema }                        from "@/lib/strategySchema";
import type { StrategySpec }                         from "@/lib/strategySchema";
import type { Bar }                                  from "@/lib/backtest/analysis-types";
import { runBacktest }                               from "@/lib/backtest/BacktestEngine";
import { generateReport }                            from "@/lib/backtest/BacktestReporter";

export const runtime    = "nodejs";
export const maxDuration = 60;
export const dynamic    = "force-dynamic";

// ------------------------------------------------------------------
// Server-to-server 認証: X-Backtest-Secret
// ------------------------------------------------------------------
function isServerAuth(req: NextRequest): boolean {
  const secret = process.env.CONSOLE_GATEWAY_SECRET ?? "";
  if (!secret) return false;
  const provided = req.headers.get("x-backtest-secret") ?? "";
  return provided === secret;
}

// ------------------------------------------------------------------
// バーデータ取得（ページネーション対応）
// ------------------------------------------------------------------
const PAGE = 1000;

async function fetchBars(symbol: string, timeframe: string): Promise<Bar[]> {
  const sb = await getAdminSupabase();
  type Row = { time_utc: string; open: number; high: number; low: number; close: number; volume: number };

  const all: Row[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await sb
      .from("bar_data")
      .select("time_utc, open, high, low, close, volume")
      .eq("symbol", symbol)
      .eq("timeframe", timeframe)
      .order("time_utc", { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) throw new Error(`bar_data fetch error (${symbol} ${timeframe}): ${error.message}`);
    const rows = (data as Row[]) ?? [];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }

  return all.map(r => ({
    time:   new Date(r.time_utc).getTime(),
    open:   Number(r.open),
    high:   Number(r.high),
    low:    Number(r.low),
    close:  Number(r.close),
    volume: r.volume ?? 0,
  }));
}

// ------------------------------------------------------------------
// 使用する全 timeframe を spec から収集
// ------------------------------------------------------------------
function collectTimeframes(spec: StrategySpec): string[] {
  const tfs = new Set<string>(spec.timeframes);
  for (const c of spec.entry_conditions.conditions) tfs.add(c.timeframe);
  if (spec.filters?.trend_filter)  tfs.add(spec.filters.trend_filter.timeframe);
  if (spec.filters?.trend_filters) spec.filters.trend_filters.forEach(tf => tfs.add(tf.timeframe));
  return [...tfs];
}

// ------------------------------------------------------------------
// ハンドラー
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  let identity = null;
  let isServer = false;

  try {
    // ── 認証 ─────────────────────────────────────────────────────
    if (isServerAuth(req)) {
      isServer = true;
    } else {
      identity = await authenticateResearch(req);
    }

    // ── リクエスト解析 ────────────────────────────────────────────
    const body = await req.json() as Record<string, unknown>;
    const rawSpec = body.strategy_spec ?? body.spec;

    if (!rawSpec || typeof rawSpec !== "object") {
      return NextResponse.json({ success: false, error: "strategy_spec が必要です" }, { status: 400 });
    }

    // UNSUPPORTED 条件を持つ spec は弾く
    const validation = StrategySpecSchema.safeParse(rawSpec);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Strategy Spec が無効です" }, { status: 422 });
    }
    const spec = validation.data;

    const unsupported = spec.entry_conditions.conditions
      .filter(c => c.condition?.startsWith("UNSUPPORTED:"))
      .map(c => c.condition!.replace("UNSUPPORTED:", "").trim());

    if (unsupported.length > 0) {
      return NextResponse.json({
        success: false,
        error: "バックテスト未対応の条件が含まれています",
        unsupported,
      }, { status: 422 });
    }

    if (spec.symbols.length !== 1) {
      return NextResponse.json({ success: false, error: "シンボルは1つのみ指定できます" }, { status: 400 });
    }

    // ── バーデータ取得 ────────────────────────────────────────────
    const symbol     = spec.symbols[0];  // e.g. "GOLD#"
    const mainTf     = spec.timeframes[0];
    const timeframes = collectTimeframes(spec);

    const barsByTf: Record<string, Bar[]> = {};
    for (const tf of timeframes) {
      barsByTf[tf] = await fetchBars(symbol, tf);
      // データがなければ "GOLD" でも試みる（シンボル表記ゆれ対応）
      if (barsByTf[tf].length === 0) {
        const fallback = symbol.replace(/[#.].*$/, "").toUpperCase();
        if (fallback !== symbol) {
          barsByTf[tf] = await fetchBars(fallback, tf);
        }
      }
    }

    const mainBars = barsByTf[mainTf] ?? [];
    if (mainBars.length === 0) {
      return NextResponse.json({
        success: false,
        error: `バーデータが見つかりません: ${symbol} ${mainTf}`,
      }, { status: 404 });
    }

    // ── バックテスト実行 ──────────────────────────────────────────
    const engineResult = runBacktest({
      spec,
      symbol,
      mainTimeframe:   mainTf,
      barsByTimeframe: barsByTf,
      initialBalance:  10_000,
      fixedLot:        0.01,
    });

    const report = generateReport({
      engineResult,
      periodLabel: "AVAILABLE",
      barCount:    mainBars.length,
    });

    // ── 方向別集計 ────────────────────────────────────────────────
    const buyTrades  = engineResult.trades.filter(t => t.direction === "BUY");
    const sellTrades = engineResult.trades.filter(t => t.direction === "SELL");
    const dirStat = (trades: typeof engineResult.trades) => ({
      trades:  trades.length,
      wins:    trades.filter(t => t.result === "WIN").length,
      pips:    Math.round(trades.reduce((s, t) => s + t.pips, 0) * 10) / 10,
      winRate: trades.length > 0
        ? Math.round((trades.filter(t => t.result === "WIN").length / trades.length) * 1000) / 10
        : 0,
    });

    // ── ログ記録（サブスク顧客のみ）──────────────────────────────
    if (!isServer && identity) {
      await logResearchAccess({
        customerId:    identity.customerId,
        systemCode:    identity.systemCode,
        endpoint:      "/api/research/backtest",
        requestParams: { symbol, timeframe: mainTf, strategyName: spec.name },
        status:        "ALLOWED",
        durationMs:    Date.now() - t0,
      });
    }

    // ── レスポンス（Trading View の preview-backtest と同形式）────
    return NextResponse.json({
      success:            true,
      report,
      trades:             engineResult.trades.slice(0, 1000),  // 最大1000件
      barCount:           mainBars.length,
      directionBreakdown: { buy: dirStat(buyTrades), sell: dirStat(sellTrades) },
      warnings:           [],
    });

  } catch (err) {
    const isAuthErr = err instanceof ResearchAuthError;
    if (!isServer && identity !== null) {
      await logResearchAccess({
        customerId:    identity?.customerId ?? null,
        systemCode:    identity?.systemCode ?? null,
        endpoint:      "/api/research/backtest",
        requestParams: {},
        status:        isAuthErr ? "DENIED" : "ERROR",
        denialReason:  isAuthErr ? (err as ResearchAuthError).reason : String(err),
        durationMs:    Date.now() - t0,
      });
    }
    const status = isAuthErr ? 401 : 500;
    return NextResponse.json({ success: false, error: (err as Error).message }, { status });
  }
}
