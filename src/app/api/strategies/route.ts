import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";
import { generatePublicId } from "@/lib/public-id";

export const dynamic = "force-dynamic";

// GET: Strategy一覧
export async function GET(_req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("strategy_registry")
    .select(`
      *,
      creator:creator_customer_id (customer_code, display_name),
      versions:strategy_versions (id, version, created_at)
    `)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: Strategy新規作成
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const { name, description, canonical_symbol, timeframes, spec, visibility, creator_customer_id, status } = body;

  if (!name || typeof name !== "string") return NextResponse.json({ error: "name は必須です" }, { status: 400 });

  // 衝突しないPublic IDを生成（最大3回試行）
  const sb = await getAdminSupabase();
  let public_id = "";
  for (let i = 0; i < 3; i++) {
    const candidate = generatePublicId();
    const { data: existing } = await sb.from("strategy_registry").select("id").eq("public_id", candidate).single();
    if (!existing) { public_id = candidate; break; }
  }
  if (!public_id) return NextResponse.json({ error: "Public ID生成に失敗しました" }, { status: 500 });

  const { data, error } = await sb
    .from("strategy_registry")
    .insert({
      public_id,
      name,
      description: description ?? null,
      canonical_symbol: canonical_symbol ?? "GOLD",
      timeframes: timeframes ?? ["H1"],
      spec: spec ?? {},
      visibility: visibility ?? "PRIVATE",
      creator_customer_id: creator_customer_id ?? null,
      status: status ?? "DRAFT",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
