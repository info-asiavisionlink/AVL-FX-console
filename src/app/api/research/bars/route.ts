import { NextRequest, NextResponse } from "next/server";
import { authenticateResearch, ResearchAuthError, logResearchAccess } from "@/lib/research-auth";
import { getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const VALID_TIMEFRAMES = ["M1","M5","M15","M30","H1","H4","D1","W1"];
const MAX_BARS = 5000; // 1リクエスト最大バー数

// POST /api/research/bars
// Customer Trading ViewのBacktestServiceが利用するHistorical Data取得API
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  let identity = null;

  try {
    identity = await authenticateResearch(req);

    const body = await req.json() as Record<string, unknown>;
    const { symbol, timeframe, from, to, limit } = body;

    // バリデーション
    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json({ error: "symbol は必須です" }, { status: 400 });
    }
    if (!timeframe || !VALID_TIMEFRAMES.includes(timeframe as string)) {
      return NextResponse.json({ error: `timeframe は ${VALID_TIMEFRAMES.join(",")} のいずれかです` }, { status: 400 });
    }

    const normalizedSymbol = (symbol as string).replace(/[#.].*$/, "").toUpperCase();

    const sb = await getAdminSupabase();
    let query = sb
      .from("bar_data")
      .select("time_utc, open, high, low, close, volume")
      .eq("symbol", normalizedSymbol)
      .eq("timeframe", timeframe as string)
      .order("time_utc", { ascending: true });

    if (from) query = query.gte("time_utc", from as string);
    if (to)   query = query.lte("time_utc", to as string);

    const maxBars = Math.min(Number(limit ?? MAX_BARS), MAX_BARS);
    query = query.limit(maxBars);

    const { data, error } = await query;
    if (error) throw error;

    const requestParams = { symbol: normalizedSymbol, timeframe, from: from ?? null, to: to ?? null, limit: maxBars };

    await logResearchAccess({
      customerId:    identity.customerId,
      systemCode:    identity.systemCode,
      endpoint:      "/api/research/bars",
      requestParams,
      status:        "ALLOWED",
      durationMs:    Date.now() - t0,
    });

    return NextResponse.json({
      ok:          true,
      symbol:      normalizedSymbol,
      timeframe,
      count:       data?.length ?? 0,
      bars:        data ?? [],
    });

  } catch (err) {
    const isAuthErr = err instanceof ResearchAuthError;
    await logResearchAccess({
      customerId:    identity?.customerId ?? null,
      systemCode:    identity?.systemCode ?? null,
      endpoint:      "/api/research/bars",
      requestParams: {},
      status:        isAuthErr ? "DENIED" : "ERROR",
      denialReason:  isAuthErr ? err.reason : String(err),
      durationMs:    Date.now() - t0,
    });
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: isAuthErr ? 401 : 500 });
  }
}
