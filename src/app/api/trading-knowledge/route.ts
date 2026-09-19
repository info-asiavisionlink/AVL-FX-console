// =================================================================
// GET  /api/trading-knowledge   → Knowledge一覧
// POST /api/trading-knowledge   → Knowledge新規作成
// =================================================================

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, getAdminSupabase } from "@/lib/admin-auth";
import { TradingKnowledgeSchema, type TradingKnowledge } from "@/lib/knowledgeSchema";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET — 一覧取得（フィルタ対応）
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  // Public Knowledge API: x-knowledge-api-secret ヘッダーで TV からも読める
  const apiSecret = req.headers.get("x-knowledge-api-secret");
  const knowledgeApiSecret = process.env.KNOWLEDGE_API_SECRET ?? "";
  const fromTradingView = knowledgeApiSecret && apiSecret === knowledgeApiSecret;

  if (!fromTradingView && !(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status");     // DRAFT | ACTIVE | ARCHIVED
  const category = searchParams.get("category");
  const market   = searchParams.get("market");

  const sb = await getAdminSupabase();
  let query = sb
    .from("trading_knowledge")
    .select("*")
    .order("created_at", { ascending: false });

  if (status)   query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (market)   query = query.contains("market", [market]);

  // TV からは ACTIVE のみ返す
  if (fromTradingView) query = query.eq("status", "ACTIVE");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: (data ?? []) as TradingKnowledge[] });
}

// ---------------------------------------------------------------------------
// POST — 新規作成
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON が必要です" }, { status: 400 });

  const validation = TradingKnowledgeSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "入力が無効です", details: validation.error.issues },
      { status: 422 }
    );
  }

  const { data: input } = validation;

  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("trading_knowledge")
    .insert({
      title:       input.title,
      category:    input.category,
      summary:     input.summary ?? null,
      content:     input.content,
      ai_usage:    input.ai_usage ?? null,
      market:      input.market,
      timeframes:  input.timeframes,
      tags:        input.tags,
      source_type: input.source_type,
      source_url:  input.source_url ?? null,
      status:      input.status ?? "DRAFT",
      version:     1,
      editor_note: input.editor_note ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
