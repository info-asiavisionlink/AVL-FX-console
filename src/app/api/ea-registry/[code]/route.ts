// GET /api/ea-registry/[code] — 識別番号で EA を取得（TV import 用）

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";

export const runtime = "nodejs";

const EA_REGISTRY_SECRET = process.env.EA_REGISTRY_SECRET ?? "";

function getAdminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const secret = req.headers.get("x-ea-registry-secret");
  if (secret !== EA_REGISTRY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;
  if (!code || !/^\d{16}$/.test(code)) {
    return NextResponse.json({ error: "無効な識別番号" }, { status: 400 });
  }

  const db = getAdminDb();
  const { data, error } = await db
    .from("ea_registry")
    .select("*")
    .eq("share_code", code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  return NextResponse.json(data);
}
