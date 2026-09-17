import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";
import { generateResearchToken } from "@/lib/research-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET: トークン一覧
export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = await getAdminSupabase();
  const { data } = await sb
    .from("system_tokens")
    .select("id, token_name, token, is_active, last_used_at, created_at, customer_system_id, notes")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });
  return NextResponse.json(data ?? []);
}

// POST: トークン発行
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as { token_name?: string; customer_system_id?: string; notes?: string };
  if (!body.token_name) return NextResponse.json({ error: "token_name は必須です" }, { status: 400 });

  const token = generateResearchToken();
  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("system_tokens")
    .insert({
      customer_id:        id,
      customer_system_id: body.customer_system_id ?? null,
      token,
      token_name:         body.token_name,
      notes:              body.notes ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
