import { NextRequest, NextResponse } from "next/server";
import { authenticateResearch, ResearchAuthError, logResearchAccess } from "@/lib/research-auth";
import { getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/research/status
// Customer Trading Viewからのアクセス権確認エンドポイント
export async function GET(req: NextRequest) {
  const t0 = Date.now();
  let identity = null;

  try {
    identity = await authenticateResearch(req);

    // 契約の詳細情報も返す（expires_at等）
    const sb = await getAdminSupabase();
    const { data: contract } = await sb
      .from("customer_contracts")
      .select("research_access_enabled, research_access_expires_at, research_fee")
      .eq("customer_id", identity.customerId)
      .single();

    await logResearchAccess({
      customerId:    identity.customerId,
      systemCode:    identity.systemCode,
      endpoint:      "/api/research/status",
      requestParams: {},
      status:        "ALLOWED",
      durationMs:    Date.now() - t0,
    });

    const expiresAt = contract?.research_access_expires_at;
    const daysLeft = expiresAt
      ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
      : null;

    return NextResponse.json({
      ok:             true,
      customer_code:  identity.customerCode,
      system_code:    identity.systemCode,
      research_access: {
        enabled:    contract?.research_access_enabled ?? false,
        expires_at: expiresAt ?? null,
        days_left:  daysLeft,
        unlimited:  expiresAt === null,
      },
    });

  } catch (err) {
    const isAuthErr = err instanceof ResearchAuthError;
    await logResearchAccess({
      customerId:    identity?.customerId ?? null,
      systemCode:    identity?.systemCode ?? null,
      endpoint:      "/api/research/status",
      requestParams: {},
      status:        "DENIED",
      denialReason:  isAuthErr ? err.reason : "ERROR",
      durationMs:    Date.now() - t0,
    });
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 401 });
  }
}
