import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET: 顧客一覧
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST: 顧客新規作成
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    customer_code: string;
    customer_name: string;
    company_name?: string;
    display_name: string;
    email: string;
    status?: string;
    notes?: string;
    tv_password?: string;
  };

  if (!body.customer_code || !body.customer_name || !body.display_name || !body.email) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("customers")
    .insert({
      customer_code: body.customer_code.toUpperCase().trim(),
      customer_name: body.customer_name.trim(),
      company_name:  body.company_name?.trim() || null,
      display_name:  body.display_name.trim(),
      email:         body.email.toLowerCase().trim(),
      status:        body.status ?? "LEAD",
      notes:         body.notes?.trim() || null,
      tv_password:   body.tv_password?.trim() || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
