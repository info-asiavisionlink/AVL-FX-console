import { getAdminSupabase } from "@/lib/admin-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StrategyDetailClient } from "./StrategyDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getStrategy(id: string) {
  const sb = await getAdminSupabase();
  const { data, error } = await sb
    .from("strategy_registry")
    .select(`
      *,
      creator:creator_customer_id (customer_code, display_name),
      versions:strategy_versions (id, version, change_notes, created_at),
      shares:strategy_shares (
        id, source_version, imported_at, created_at,
        target_customer:target_customer_id (customer_code, display_name)
      )
    `)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:    { label: "Draft",    color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  ACTIVE:   { label: "Active",   color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  ARCHIVED: { label: "Archived", color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
};

export default async function StrategyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const strategy = await getStrategy(id);
  if (!strategy) notFound();

  const statCfg = STATUS_CFG[strategy.status as string] ?? STATUS_CFG.DRAFT;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/strategies" style={{ color: "#9a9a9a", fontSize: 13 }}>← Strategy一覧</Link>
          <span style={{ color: "#d0d0d0" }}>/</span>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black" style={{ color: "#1a1a1a" }}>{strategy.name as string}</h2>
            <span style={{
              color: statCfg.color, background: statCfg.bg,
              padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
            }}>{statCfg.label}</span>
          </div>
        </div>
      </div>

      {strategy.description && (
        <p className="text-sm" style={{ color: "#4a4a4a" }}>{strategy.description as string}</p>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <StrategyDetailClient strategy={strategy as any} />
    </div>
  );
}
