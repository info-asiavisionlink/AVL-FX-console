import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET: 顧客の契約情報取得（なければ null）
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = await getAdminSupabase();
  const { data } = await sb
    .from("customer_contracts")
    .select("*")
    .eq("customer_id", id)
    .single();
  return NextResponse.json(data ?? null);
}

// POST: 契約情報新規作成
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const sb = await getAdminSupabase();

  // 既存チェック
  const { data: existing } = await sb.from("customer_contracts").select("id").eq("customer_id", id).single();
  if (existing) return NextResponse.json({ error: "契約情報はすでに存在します" }, { status: 409 });

  const { data, error } = await sb
    .from("customer_contracts")
    .insert({ customer_id: id })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PUT: 契約情報更新
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as Record<string, unknown>;
  const allowed = [
    "development_fee","development_payment_status","development_paid_at","development_invoice_ref",
    "management_fee","management_status","management_started_at","management_ended_at","management_billing_day",
    "research_access_enabled","research_fee","research_access_started_at","research_access_expires_at","research_access_notes",
    "transfer_status","transfer_fee","transferred_at","transfer_notes","notes",
  ];

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) {
      const val = body[key];
      // 空文字はnullに変換（日付・数値フィールド）
      update[key] = val === "" ? null : val;
    }
  }

  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("customer_contracts")
    .update(update)
    .eq("customer_id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
