// =================================================================
// GET    /api/trading-knowledge/[id]  → 単一取得
// PATCH  /api/trading-knowledge/[id]  → 更新（version++）
// DELETE /api/trading-knowledge/[id]  → 削除（ARCHIVEへ）
// =================================================================

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";
import { TradingKnowledgeUpdateSchema } from "@/lib/knowledgeSchema";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET — 単一取得
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("trading_knowledge")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// PATCH — 更新（version を自動インクリメント）
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON が必要です" }, { status: 400 });

  const validation = TradingKnowledgeUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "入力が無効です", details: validation.error.issues },
      { status: 422 }
    );
  }

  const input = validation.data;
  const sb = await getAdminSupabase();

  // 現在のバージョンを取得してインクリメント
  const { data: current } = await sb
    .from("trading_knowledge")
    .select("version")
    .eq("id", id)
    .single();

  const newVersion = (current?.version ?? 0) + 1;

  const { data, error } = await sb
    .from("trading_knowledge")
    .update({
      ...input,
      version:    newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// DELETE — ARCHIVE（物理削除ではなく status = ARCHIVED）
// ---------------------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sb = await getAdminSupabase();
  const { error } = await sb
    .from("trading_knowledge")
    .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
