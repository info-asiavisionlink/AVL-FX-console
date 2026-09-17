import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET: gold_data_config一覧取得（bar_dataの統計も合わせて返す）
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = await getAdminSupabase();

  const [{ data: configs }, { data: barStats }] = await Promise.all([
    sb.from("gold_data_config").select("*").order("created_at"),
    sb.rpc("get_bar_data_status"),
  ]);

  // bar_statsをcanonical_symbolでインデックス化
  const statsMap = new Map<string, Record<string, unknown>[]>();
  if (barStats) {
    for (const row of barStats as Array<{ symbol: string; timeframe: string; bar_count: number; oldest_bar: string; newest_bar: string }>) {
      const sym = row.symbol.toUpperCase();
      if (!statsMap.has(sym)) statsMap.set(sym, []);
      statsMap.get(sym)!.push(row);
    }
  }

  const result = (configs ?? []).map((cfg: Record<string, unknown>) => ({
    ...cfg,
    bar_stats: statsMap.get((cfg.canonical_symbol as string).toUpperCase()) ?? [],
  }));

  return NextResponse.json(result);
}

// PUT: gold_data_config更新（enabled / timeframes）
export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { id: string; enabled?: boolean; timeframes?: string[]; notes?: string };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sb = await getAdminSupabase();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.enabled !== undefined) update.enabled = body.enabled;
  if (body.timeframes !== undefined) update.timeframes = body.timeframes;
  if (body.notes !== undefined) update.notes = body.notes;

  const { error } = await sb.from("gold_data_config").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// POST: bar_dataの統計をgold_data_configに同期
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = await getAdminSupabase();

  const { data: configs } = await sb.from("gold_data_config").select("id, canonical_symbol");
  const { data: barStats } = await sb.rpc("get_bar_data_status");

  if (!configs || !barStats) return NextResponse.json({ ok: true, updated: 0 });

  let updated = 0;
  for (const cfg of configs as Array<{ id: string; canonical_symbol: string }>) {
    const sym = cfg.canonical_symbol.toUpperCase();
    const rows = (barStats as Array<{ symbol: string; bar_count: number; oldest_bar: string; newest_bar: string }>)
      .filter(r => r.symbol.toUpperCase() === sym);

    if (rows.length === 0) continue;

    const totalBars = rows.reduce((s, r) => s + Number(r.bar_count), 0);
    const earliestBar = rows.reduce((min, r) => r.oldest_bar < min ? r.oldest_bar : min, rows[0].oldest_bar);
    const latestBar = rows.reduce((max, r) => r.newest_bar > max ? r.newest_bar : max, rows[0].newest_bar);

    await sb.from("gold_data_config").update({
      stored_bars:     totalBars,
      earliest_bar_at: earliestBar,
      latest_bar_at:   latestBar,
      last_sync_at:    new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    }).eq("id", cfg.id);

    updated++;
  }

  return NextResponse.json({ ok: true, updated });
}
