import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// POST /api/monitoring/report
// Customer Trading GatewayからのHeartbeat受信エンドポイント
// 認証: X-System-Token (system_tokens.token)
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-system-token") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "X-System-Token ヘッダーが必要です" }, { status: 401 });

  const sb = await getAdminSupabase();

  // トークン検証
  const { data: tokenRow } = await sb
    .from("system_tokens")
    .select("id, customer_id, customer_system_id, is_active")
    .eq("token", token)
    .single();

  if (!tokenRow || !tokenRow.is_active) {
    return NextResponse.json({ error: "無効なトークンです" }, { status: 401 });
  }

  const body = await req.json() as Record<string, unknown>;
  const {
    gateway_online        = true,
    mt5_connected         = false,
    mt5_account_mode      = null,
    bridge_version        = null,
    active_strategy_count = 0,
    metadata              = {},
  } = body;

  const now = new Date().toISOString();

  // customer_systems の last_seen_at を更新
  if (tokenRow.customer_system_id) {
    await sb
      .from("customer_systems")
      .update({ last_seen_at: now })
      .eq("id", tokenRow.customer_system_id);
  }

  // system_code を取得
  let systemCode = "unknown";
  if (tokenRow.customer_system_id) {
    const { data: sys } = await sb
      .from("customer_systems")
      .select("system_code")
      .eq("id", tokenRow.customer_system_id)
      .single();
    if (sys) systemCode = sys.system_code;
  }

  // ヘルスログを記録
  const { error } = await sb.from("system_health_logs").insert({
    customer_id:           tokenRow.customer_id,
    customer_system_id:    tokenRow.customer_system_id,
    system_code:           systemCode,
    gateway_online:        gateway_online as boolean,
    mt5_connected:         mt5_connected as boolean,
    mt5_account_mode:      mt5_account_mode as string | null,
    bridge_version:        bridge_version as string | null,
    active_strategy_count: Number(active_strategy_count),
    metadata:              metadata as object,
    reported_at:           now,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // last_used_at 更新
  await sb.from("system_tokens").update({ last_used_at: now }).eq("id", tokenRow.id);

  return NextResponse.json({ ok: true, received_at: now });
}
