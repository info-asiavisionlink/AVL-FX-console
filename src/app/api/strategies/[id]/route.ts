import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET: Strategy詳細（versions + shares含む）
export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("strategy_registry")
    .select(`
      *,
      creator:creator_customer_id (customer_code, display_name),
      versions:strategy_versions (id, version, change_notes, created_at),
      shares:strategy_shares (
        id, source_version, imported_at, created_at,
        target_customer:target_customer_id (customer_code, display_name)
      )
    `)
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

// PUT: Strategy更新
export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as Record<string, unknown>;
  const allowed = ["name", "description", "canonical_symbol", "timeframes", "spec", "visibility", "creator_customer_id", "status"];

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key] === "" ? null : body[key];
  }

  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("strategy_registry")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: Strategy削除（DRAFT のみ）
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = await getAdminSupabase();

  const { data: existing } = await sb.from("strategy_registry").select("status").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "DRAFT") return NextResponse.json({ error: "DRAFTのみ削除可能です" }, { status: 400 });

  const { error } = await sb.from("strategy_registry").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
