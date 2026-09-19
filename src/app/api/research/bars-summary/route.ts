// GET /api/research/bars-summary
// GOLD# 各時間足のデータ期間サマリーを返す（EA Builder の UI 表示用）
// 認証不要（公開情報）

import { NextResponse }    from "next/server";
import { getAdminSupabase } from "@/lib/admin-auth";

export const dynamic    = "force-dynamic";
export const runtime    = "nodejs";

const TIMEFRAMES = ["M1","M5","M15","M30","H1","H4","D1","W1"] as const;
const SYMBOL     = "GOLD#";

export async function GET() {
  const sb = await getAdminSupabase();

  const results: Record<string, {
    timeframe: string;
    count:     number;
    firstDate: string | null;
    lastDate:  string | null;
    years:     number;
    label:     string;
  }> = {};

  await Promise.all(TIMEFRAMES.map(async (tf) => {
    const [oldest, newest] = await Promise.all([
      sb.from("bar_data")
        .select("time_utc")
        .eq("symbol", SYMBOL)
        .eq("timeframe", tf)
        .order("time_utc", { ascending: true })
        .limit(1)
        .single(),
      sb.from("bar_data")
        .select("time_utc")
        .eq("symbol", SYMBOL)
        .eq("timeframe", tf)
        .order("time_utc", { ascending: false })
        .limit(1)
        .single(),
    ]);

    // 件数は Content-Range ヘッダーが必要だが RPC で代替
    const { count } = await sb
      .from("bar_data")
      .select("*", { count: "exact", head: true })
      .eq("symbol", SYMBOL)
      .eq("timeframe", tf);

    const firstDate = oldest.data?.time_utc?.slice(0, 10) ?? null;
    const lastDate  = newest.data?.time_utc?.slice(0, 10) ?? null;

    let years = 0;
    if (firstDate && lastDate) {
      const diff = new Date(lastDate).getTime() - new Date(firstDate).getTime();
      years = diff / (1000 * 60 * 60 * 24 * 365.25);
    }

    // 人間が読みやすいラベル
    let label = "データなし";
    if (count && count > 0) {
      if (years >= 1) {
        label = `約${years.toFixed(0)}年分`;
      } else if (years >= 1/12) {
        label = `約${(years * 12).toFixed(0)}ヶ月分`;
      } else {
        label = `約${(years * 365).toFixed(0)}日分`;
      }
    }

    results[tf] = {
      timeframe: tf,
      count:     count ?? 0,
      firstDate,
      lastDate,
      years:     Math.round(years * 10) / 10,
      label,
    };
  }));

  return NextResponse.json({ symbol: SYMBOL, timeframes: results });
}
