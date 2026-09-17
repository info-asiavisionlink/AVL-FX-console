import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET: デプロイ履歴一覧
export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("deployments")
    .select("*")
    .eq("customer_id", id)
    .order("deployed_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST: デプロイ記録
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as Record<string, unknown>;
  const {
    customer_system_id, system_code,
    deploy_type, version, bridge_version, vercel_url,
    status, notes, deployed_by, deployed_at,
  } = body;

  if (!deploy_type) return NextResponse.json({ error: "deploy_type は必須です" }, { status: 400 });

  const sb = await getAdminSupabase();

  // Bridge EA デプロイの場合、customer_systems の bridge_version を更新
  if (deploy_type === "BRIDGE_EA" && customer_system_id && bridge_version) {
    await sb
      .from("customer_systems")
      .update({ bridge_version: bridge_version as string, updated_at: new Date().toISOString() })
      .eq("id", customer_system_id as string);
  }

  // Trading View デプロイの場合、last_deployed_at を更新
  if ((deploy_type === "TRADING_VIEW" || deploy_type === "FULL") && customer_system_id) {
    await sb
      .from("customer_systems")
      .update({ last_deployed_at: (deployed_at as string) ?? new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", customer_system_id as string);
  }

  const { data, error } = await sb
    .from("deployments")
    .insert({
      customer_id:        id,
      customer_system_id: customer_system_id ?? null,
      system_code:        system_code ?? null,
      deploy_type,
      version:            version ?? null,
      bridge_version:     bridge_version ?? null,
      vercel_url:         vercel_url ?? null,
      status:             status ?? "SUCCESS",
      notes:              notes ?? null,
      deployed_by:        deployed_by ?? null,
      deployed_at:        (deployed_at as string) ?? new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
