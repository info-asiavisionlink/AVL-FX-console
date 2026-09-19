// =================================================================
// POST /api/customers/[id]/setup
//
// 顧客のセットアップパッケージを自動生成する。
//
// 実行内容:
//   1. Trading View Supabase に Supabase ユーザーを作成
//   2. TV Supabase の mt5_connections に Connection Token を生成
//   3. Console Supabase に Research API Token を生成
//   4. セットアップパッケージを返す（Token は一度のみ平文で返す）
//
// 既存セットアップがある場合:
//   再生成（トークンを上書き）する。
// =================================================================

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";
import { createClient }              from "@supabase/supabase-js";
import { generateResearchToken }     from "@/lib/research-auth";

export const dynamic     = "force-dynamic";
export const runtime     = "nodejs";
export const maxDuration = 30;

const TV_URL      = process.env.TV_SUPABASE_URL              ?? "";
const TV_KEY      = process.env.TV_SUPABASE_SERVICE_ROLE_KEY ?? "";
const TV_GW_URL   = process.env.TV_GATEWAY_URL               ?? "https://remarkable-cooperation-production-7341.up.railway.app";
const TV_APP_URL  = "https://avl-fx.vercel.app";

function getTvAdmin() {
  if (!TV_URL || !TV_KEY) throw new Error("TV_SUPABASE_URL / TV_SUPABASE_SERVICE_ROLE_KEY が未設定です");
  return createClient(TV_URL, TV_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ── Web Crypto でトークンと SHA-256 ハッシュを生成 ─────────────────
async function generateTokenAndHash(): Promise<{ token: string; hash: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token = Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");

  const encoder   = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  const hash       = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

  return { token, hash };
}

// ── ランダム仮パスワード生成（12文字） ────────────────────────────
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => chars[b % chars.length]).join("");
}

// =================================================================
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: customerId } = await params;

  const sb   = await getAdminSupabase();
  const tvSb = getTvAdmin();

  // ── 1. 顧客情報取得 ──────────────────────────────────────────────
  const { data: customer, error: custErr } = await sb
    .from("customers")
    .select("customer_code, customer_name, display_name, email, status")
    .eq("id", customerId)
    .single();

  if (custErr || !customer) {
    return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
  }

  const tempPassword = generateTempPassword();

  // ── 2. Trading View Supabase にユーザー作成（既存なら取得） ───────
  let tvUserId: string;
  let isNewTvUser = false;

  // メールで既存ユーザーを検索（listUsers はページネーション付きで検索）
  const { data: existingUsers } = await tvSb.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = existingUsers?.users?.find(u => u.email === customer.email);

  if (existingUser) {
    tvUserId = existingUser.id;
    // パスワードのみ更新
    await tvSb.auth.admin.updateUserById(tvUserId, { password: tempPassword });
  } else {
    const { data: newUser, error: createErr } = await tvSb.auth.admin.createUser({
      email:             customer.email,
      password:          tempPassword,
      email_confirm:     true,  // メール確認なしですぐ使える
      user_metadata: {
        customer_code:   customer.customer_code,
        display_name:    customer.display_name,
        customer_id:     customerId,
      },
    });
    if (createErr || !newUser.user) {
      return NextResponse.json({ error: `TV ユーザー作成失敗: ${createErr?.message}` }, { status: 500 });
    }
    tvUserId   = newUser.user.id;
    isNewTvUser = true;
  }

  // ── 3. MT5 Connection Token 生成（既存は上書き） ──────────────────
  const { token: connectionToken, hash: tokenHash } = await generateTokenAndHash();

  // 既存の接続レコードを確認
  const { data: existingConn } = await tvSb
    .from("mt5_connections")
    .select("id")
    .eq("user_id", tvUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let connectionId: string;

  if (existingConn) {
    // 既存トークンを上書き
    connectionId = existingConn.id;
    await tvSb
      .from("mt5_connections")
      .update({
        connection_token_hash: tokenHash,
        status:                "DISCONNECTED",
        updated_at:            new Date().toISOString(),
      })
      .eq("id", connectionId);
  } else {
    // 新規作成
    const { data: newConn, error: connErr } = await tvSb
      .from("mt5_connections")
      .insert({
        user_id:               tvUserId,
        connection_token_hash: tokenHash,
        status:                "DISCONNECTED",
        broker:                "XM Trading",
        server_name:           "XMTrading-MT5",
        mt5_login:             0,          // EA 接続時に自動更新される
        account_currency:      "USD",
        account_type:          "REAL",
        account_mode:          "HEDGING",
        leverage:              100,
      })
      .select("id")
      .single();

    if (connErr || !newConn) {
      return NextResponse.json({ error: `MT5 接続作成失敗: ${connErr?.message}` }, { status: 500 });
    }
    connectionId = newConn.id;
  }

  // ── 4. Research API Token 生成（Console Supabase） ───────────────
  const researchToken = generateResearchToken();

  // 既存トークンを無効化して新規作成
  await sb.from("system_tokens")
    .update({ is_active: false })
    .eq("customer_id", customerId)
    .eq("is_active", true);

  const { data: tokenRow } = await sb
    .from("system_tokens")
    .insert({
      customer_id: customerId,
      token_name:  `${customer.customer_code} セットアップ自動発行`,
      token:       researchToken,
      is_active:   true,
      notes:       `自動生成 ${new Date().toLocaleDateString("ja-JP")}`,
    })
    .select("id")
    .single();

  // ── 5. 契約の research_access_enabled を有効化 ───────────────────
  const { data: contract } = await sb
    .from("customer_contracts")
    .select("id")
    .eq("customer_id", customerId)
    .single();

  if (contract) {
    await sb
      .from("customer_contracts")
      .update({ research_access_enabled: true, research_access_started_at: new Date().toISOString() })
      .eq("customer_id", customerId);
  } else {
    await sb
      .from("customer_contracts")
      .insert({
        customer_id:             customerId,
        research_access_enabled: true,
        research_access_started_at: new Date().toISOString(),
      });
  }

  // ── 6. セットアップパッケージを返す ──────────────────────────────
  return NextResponse.json({
    ok: true,
    package: {
      // Trading View ログイン情報
      app_url:          TV_APP_URL,
      email:            customer.email,
      temp_password:    tempPassword,
      is_new_tv_user:   isNewTvUser,

      // MT5 Bridge EA 設定
      gateway_url:      TV_GW_URL,
      connection_id:    connectionId,
      connection_token: connectionToken,   // 平文 — この1回のみ

      // Research API
      research_token:   researchToken,
      token_id:         tokenRow?.id ?? null,

      // メタ
      customer_code:    customer.customer_code,
      display_name:     customer.display_name,
      generated_at:     new Date().toISOString(),
    },
  });
}

// GET: 既存のセットアップ情報（Token 平文は含まない）
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: customerId } = await params;

  const sb = await getAdminSupabase();

  const { data: customer } = await sb
    .from("customers")
    .select("customer_code, display_name, email")
    .eq("id", customerId)
    .single();

  if (!customer) return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });

  // TV ユーザーの接続 ID を確認
  const tvSb = getTvAdmin();
  const { data: existingUsers } = await tvSb.auth.admin.listUsers({ perPage: 1000 });
  const tvUser = existingUsers?.users?.find(u => u.email === customer.email);

  let connectionId: string | null = null;
  if (tvUser) {
    const { data: conn } = await tvSb
      .from("mt5_connections")
      .select("id, status, last_heartbeat_at")
      .eq("user_id", tvUser.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (conn) connectionId = conn.id;
  }

  const { data: tokens } = await sb
    .from("system_tokens")
    .select("id, token_name, is_active, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: contract } = await sb
    .from("customer_contracts")
    .select("research_access_enabled, research_access_started_at")
    .eq("customer_id", customerId)
    .single();

  return NextResponse.json({
    app_url:          TV_APP_URL,
    gateway_url:      TV_GW_URL,
    email:            customer.email,
    tv_user_exists:   !!tvUser,
    connection_id:    connectionId,
    research_enabled: contract?.research_access_enabled ?? false,
    tokens:           tokens ?? [],
  });
}
