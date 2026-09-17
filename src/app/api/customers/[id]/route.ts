import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET: 顧客詳細
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = await getAdminSupabase();
  const { data, error } = await sb.from("customers").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

// PUT: 顧客情報更新
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as Record<string, string | null>;
  const allowed = [
    "customer_name","company_name","display_name","email","status","notes",
    "development_started_at","delivered_at","maintenance_started_at","maintenance_ended_at",
  ];

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key] || null;
  }

  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("customers")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
