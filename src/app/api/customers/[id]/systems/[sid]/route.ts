import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// PUT: System情報更新
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; sid: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sid } = await params;

  const body = await req.json() as Record<string, string | null>;
  const allowed = [
    "system_name","version","bridge_version","production_url",
    "github_repository","vercel_project_name","railway_project_name",
    "supabase_project_name","system_status","notes","last_deployed_at",
  ];

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key] || null;
  }

  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("customer_systems")
    .update(update)
    .eq("id", sid)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
