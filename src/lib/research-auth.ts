import { NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/admin-auth";

export interface ResearchIdentity {
  customerId: string;
  customerCode: string;
  tokenId: string;
  systemCode: string | null;
}

export type ResearchDenialReason =
  | "MISSING_TOKEN"
  | "INVALID_TOKEN"
  | "TOKEN_REVOKED"
  | "NO_CONTRACT"
  | "RESEARCH_DISABLED"
  | "RESEARCH_EXPIRED";

export class ResearchAuthError extends Error {
  constructor(public readonly reason: ResearchDenialReason, message: string) {
    super(message);
  }
}

// Research API リクエストを認証し、entitlement（利用権）を確認する
export async function authenticateResearch(req: NextRequest): Promise<ResearchIdentity> {
  const rawToken = req.headers.get("x-research-token") ?? req.headers.get("authorization")?.replace("Bearer ", "");

  if (!rawToken) throw new ResearchAuthError("MISSING_TOKEN", "X-Research-Token ヘッダーが必要です");

  const sb = await getAdminSupabase();

  // 1. トークン検索
  const { data: tokenRow } = await sb
    .from("system_tokens")
    .select("id, customer_id, customer_system_id, is_active, token_name")
    .eq("token", rawToken)
    .single();

  if (!tokenRow) throw new ResearchAuthError("INVALID_TOKEN", "無効なトークンです");
  if (!tokenRow.is_active) throw new ResearchAuthError("TOKEN_REVOKED", "このトークンは失効しています");

  // 2. 顧客情報取得
  const { data: customer } = await sb
    .from("customers")
    .select("id, customer_code, status")
    .eq("id", tokenRow.customer_id)
    .single();

  if (!customer) throw new ResearchAuthError("INVALID_TOKEN", "顧客情報が見つかりません");

  // 3. 契約・Research Access 確認
  const { data: contract } = await sb
    .from("customer_contracts")
    .select("research_access_enabled, research_access_expires_at")
    .eq("customer_id", tokenRow.customer_id)
    .single();

  if (!contract) throw new ResearchAuthError("NO_CONTRACT", "契約情報が登録されていません");
  if (!contract.research_access_enabled) throw new ResearchAuthError("RESEARCH_DISABLED", "Research Access が無効です");

  if (contract.research_access_expires_at) {
    const expiresAt = new Date(contract.research_access_expires_at);
    if (expiresAt < new Date()) throw new ResearchAuthError("RESEARCH_EXPIRED", `Research Access が期限切れです (${expiresAt.toLocaleDateString("ja-JP")})`);
  }

  // 4. last_used_at 更新（fire and forget）
  sb.from("system_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tokenRow.id).then(() => {});

  // 5. system_code 取得（あれば）
  let systemCode: string | null = null;
  if (tokenRow.customer_system_id) {
    const { data: sys } = await sb
      .from("customer_systems")
      .select("system_code")
      .eq("id", tokenRow.customer_system_id)
      .single();
    systemCode = sys?.system_code ?? null;
  }

  return {
    customerId: customer.id,
    customerCode: customer.customer_code,
    tokenId: tokenRow.id,
    systemCode,
  };
}

// Research API アクセスを audit log に記録
export async function logResearchAccess(opts: {
  customerId: string | null;
  systemCode: string | null;
  endpoint: string;
  requestParams: Record<string, unknown>;
  status: "ALLOWED" | "DENIED" | "ERROR";
  denialReason?: string;
  durationMs?: number;
}) {
  const sb = await getAdminSupabase();
  await sb.from("research_access_log").insert({
    customer_id:    opts.customerId,
    system_code:    opts.systemCode,
    endpoint:       opts.endpoint,
    request_params: opts.requestParams,
    status:         opts.status,
    denial_reason:  opts.denialReason ?? null,
    duration_ms:    opts.durationMs ?? null,
  });
}

// トークン生成: rtk_ + 32文字英数字
export function generateResearchToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "rtk_";
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  for (const byte of array) result += chars[byte % chars.length];
  return result;
}
