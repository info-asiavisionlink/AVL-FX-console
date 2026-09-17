import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET: 顧客のSystem一覧
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("customer_systems")
    .select("*")
    .eq("customer_id", id)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST: System新規登録
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as {
    system_code: string;
    system_name: string;
    version?: string;
    bridge_version?: string;
    production_url?: string;
    github_repository?: string;
    vercel_project_name?: string;
    railway_project_name?: string;
    supabase_project_name?: string;
    system_status?: string;
    notes?: string;
  };

  if (!body.system_code || !body.system_name) {
    return NextResponse.json({ error: "system_code と system_name は必須です" }, { status: 400 });
  }

  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("customer_systems")
    .insert({
      customer_id:           id,
      system_code:           body.system_code.toUpperCase().trim(),
      system_name:           body.system_name.trim(),
      version:               body.version?.trim() || null,
      bridge_version:        body.bridge_version?.trim() || null,
      production_url:        body.production_url?.trim() || null,
      github_repository:     body.github_repository?.trim() || null,
      vercel_project_name:   body.vercel_project_name?.trim() || null,
      railway_project_name:  body.railway_project_name?.trim() || null,
      supabase_project_name: body.supabase_project_name?.trim() || null,
      system_status:         body.system_status ?? "BUILDING",
      notes:                 body.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
