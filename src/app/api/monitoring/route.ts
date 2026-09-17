import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/monitoring
// 全顧客Systemの稼働状態サマリーを返す
export async function GET(_req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = await getAdminSupabase();

  // 顧客 + System + 契約 を一括取得
  const { data: systems, error } = await sb
    .from("customer_systems")
    .select(`
      id, system_code, system_name, system_status,
      production_url, bridge_version, last_seen_at, last_deployed_at,
      customer:customer_id (
        id, customer_code, display_name, status,
        contract:customer_contracts (
          research_access_enabled, research_access_expires_at, management_status
        )
      )
    `)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 各Systemの最新ヘルスログを取得
  const systemIds = (systems ?? []).map(s => s.id);
  const latestHealth: Record<string, {
    mt5_connected: boolean;
    active_strategy_count: number;
    bridge_version: string | null;
    mt5_account_mode: string | null;
    reported_at: string;
  }> = {};

  if (systemIds.length > 0) {
    for (const sysId of systemIds) {
      const { data: log } = await sb
        .from("system_health_logs")
        .select("mt5_connected, active_strategy_count, bridge_version, mt5_account_mode, reported_at")
        .eq("customer_system_id", sysId)
        .order("reported_at", { ascending: false })
        .limit(1)
        .single();
      if (log) latestHealth[sysId] = log;
    }
  }

  return NextResponse.json({ systems: systems ?? [], latestHealth });
}
