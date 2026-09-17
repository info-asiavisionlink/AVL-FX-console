import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; tid: string }> };

// DELETE: トークン失効（is_active = false）
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, tid } = await params;
  const sb = await getAdminSupabase();
  const { error } = await sb
    .from("system_tokens")
    .update({ is_active: false })
    .eq("id", tid)
    .eq("customer_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
