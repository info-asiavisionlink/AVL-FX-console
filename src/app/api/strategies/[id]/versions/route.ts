import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// POST: 新バージョンを保存（現在のspecをスナップショット）
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as { change_notes?: string };
  const sb = await getAdminSupabase();

  // 現在のSpecを取得
  const { data: strategy } = await sb.from("strategy_registry").select("spec").eq("id", id).single();
  if (!strategy) return NextResponse.json({ error: "Strategy not found" }, { status: 404 });

  // 最新バージョン番号を取得
  const { data: latest } = await sb
    .from("strategy_versions")
    .select("version")
    .eq("strategy_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (latest?.version ?? 0) + 1;

  const { data, error } = await sb
    .from("strategy_versions")
    .insert({
      strategy_id: id,
      version: nextVersion,
      spec_snapshot: strategy.spec,
      change_notes: body.change_notes ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
