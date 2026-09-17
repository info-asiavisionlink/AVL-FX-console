import { NextRequest, NextResponse } from "next/server";
import { authenticateResearch, ResearchAuthError, logResearchAccess } from "@/lib/research-auth";
import { getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// POST /api/research/backtest
// Backtest実行エンドポイント
// Bar生データは返却せず、集計結果（PnL / 勝率 / 最大DD等）のみ返却
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  let identity = null;

  try {
    identity = await authenticateResearch(req);

    const body = await req.json() as Record<string, unknown>;
    const { strategy_spec, timeframe, from, to } = body;

    if (!strategy_spec || typeof strategy_spec !== "object") {
      return NextResponse.json({ error: "strategy_spec は必須です" }, { status: 400 });
    }
    if (!timeframe || !from || !to) {
      return NextResponse.json({ error: "timeframe / from / to は必須です" }, { status: 400 });
    }

    // Bar データ取得
    const sb = await getAdminSupabase();
    const { data: bars, error: barsErr } = await sb
      .from("bar_data")
      .select("time_utc, open, high, low, close, volume")
      .eq("symbol", "GOLD")
      .eq("timeframe", timeframe as string)
      .gte("time_utc", from as string)
      .lte("time_utc", to as string)
      .order("time_utc", { ascending: true })
      .limit(10000);

    if (barsErr) throw barsErr;
    if (!bars || bars.length === 0) {
      return NextResponse.json({ ok: false, error: "指定期間のデータがありません" }, { status: 404 });
    }

    // Backtest実行（簡易エンジン: strategy_specのentry/exit条件を評価）
    const result = runBacktest(bars, strategy_spec as StrategySpec);

    const requestParams = {
      timeframe, from, to,
      bar_count: bars.length,
      strategy_name: (strategy_spec as StrategySpec).name ?? "unnamed",
    };

    await logResearchAccess({
      customerId:    identity.customerId,
      systemCode:    identity.systemCode,
      endpoint:      "/api/research/backtest",
      requestParams,
      status:        "ALLOWED",
      durationMs:    Date.now() - t0,
    });

    return NextResponse.json({
      ok:          true,
      bar_count:   bars.length,
      timeframe,
      from,
      to,
      result,
    });

  } catch (err) {
    const isAuthErr = err instanceof ResearchAuthError;
    await logResearchAccess({
      customerId:    identity?.customerId ?? null,
      systemCode:    identity?.systemCode ?? null,
      endpoint:      "/api/research/backtest",
      requestParams: {},
      status:        isAuthErr ? "DENIED" : "ERROR",
      denialReason:  isAuthErr ? err.reason : String(err),
      durationMs:    Date.now() - t0,
    });
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: isAuthErr ? 401 : 500 });
  }
}

// ====================== 簡易バックテストエンジン ======================
interface Bar {
  time_utc: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StrategySpec {
  name?: string;
  // 将来: entry_conditions, exit_conditions, filters, risk
  [key: string]: unknown;
}

interface BacktestResult {
  total_trades:     number;
  winning_trades:   number;
  losing_trades:    number;
  win_rate:         number;
  total_pnl_pips:   number;
  max_drawdown_pips: number;
  profit_factor:    number;
  note:             string;
}

function runBacktest(bars: Bar[], _spec: StrategySpec): BacktestResult {
  // Phase 1: 簡易エンジン（Trading View BacktestEngineの移植はC10で対応）
  // 現在はランダムウォーク相当の統計でインターフェース疎通確認
  if (bars.length < 10) {
    return {
      total_trades: 0, winning_trades: 0, losing_trades: 0,
      win_rate: 0, total_pnl_pips: 0, max_drawdown_pips: 0, profit_factor: 0,
      note: "データ不足（最低10本必要）",
    };
  }

  // 単純移動平均クロス（デモ用簡易実装）
  const period = 20;
  let trades = 0, wins = 0, totalPnl = 0, maxDD = 0, peakPnl = 0;
  let inPosition = false;
  let entryPrice = 0;

  for (let i = period; i < bars.length - 1; i++) {
    const sma = bars.slice(i - period, i).reduce((s, b) => s + b.close, 0) / period;
    const prevSma = bars.slice(i - period - 1, i - 1).reduce((s, b) => s + b.close, 0) / period;

    if (!inPosition && bars[i].close > sma && bars[i - 1].close <= prevSma) {
      inPosition = true; entryPrice = bars[i + 1].open;
    } else if (inPosition && bars[i].close < sma) {
      const pnl = (bars[i + 1].open - entryPrice) * 10;
      totalPnl += pnl;
      if (pnl > 0) wins++;
      trades++;
      inPosition = false;
      if (totalPnl > peakPnl) peakPnl = totalPnl;
      if (peakPnl - totalPnl > maxDD) maxDD = peakPnl - totalPnl;
    }
  }

  const losses = trades - wins;
  const grossWin  = wins  > 0 ? (totalPnl > 0 ? totalPnl : 0) : 0;
  const grossLoss = losses > 0 ? Math.abs(Math.min(totalPnl, 0)) : 1;

  return {
    total_trades:     trades,
    winning_trades:   wins,
    losing_trades:    losses,
    win_rate:         trades > 0 ? Math.round((wins / trades) * 1000) / 10 : 0,
    total_pnl_pips:   Math.round(totalPnl * 10) / 10,
    max_drawdown_pips: Math.round(maxDD * 10) / 10,
    profit_factor:    Math.round((grossWin / grossLoss) * 100) / 100,
    note:             "Phase1: SMAクロス簡易エンジン。strategy_specのカスタム条件評価はPhase2（C10）で対応。",
  };
}
