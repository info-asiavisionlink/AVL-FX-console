// GET  /api/ea-registry  — EA一覧（Console フロントエンド用）
// POST /api/ea-registry  — TV から EA を登録

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";

export const runtime = "nodejs";

const EA_REGISTRY_SECRET = process.env.EA_REGISTRY_SECRET ?? "";

function getAdminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function verifySecret(req: NextRequest): boolean {
  return req.headers.get("x-ea-registry-secret") === EA_REGISTRY_SECRET;
}

// ---------------------------------------------------------------------------
// GET — EA 一覧
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, Number(searchParams.get("page")  ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 50));

  const db = getAdminDb();
  const { data, error, count } = await db
    .from("ea_registry")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [], total: count ?? 0, page, limit });
}

// ---------------------------------------------------------------------------
// POST — TV から EA 登録
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    share_code:     string;
    tv_strategy_id: string;
    tv_user_id?:    string | null;
    name:           string;
    strategy_type:  string;
    spec:           unknown;
    backtest_result?: unknown;
    raw_prompt?:    string | null;
  };

  if (!body.share_code || !/^\d{16}$/.test(body.share_code)) {
    return NextResponse.json({ error: "share_code が不正です" }, { status: 400 });
  }

  const db = getAdminDb();
  const { data, error } = await db
    .from("ea_registry")
    .insert({
      share_code:      body.share_code,
      tv_strategy_id:  body.tv_strategy_id,
      tv_user_id:      body.tv_user_id ?? null,
      name:            body.name,
      strategy_type:   body.strategy_type,
      spec:            body.spec,
      backtest_result: body.backtest_result ?? null,
      raw_prompt:      body.raw_prompt ?? null,
    })
    .select("id, share_code")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "識別番号が重複しています" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
