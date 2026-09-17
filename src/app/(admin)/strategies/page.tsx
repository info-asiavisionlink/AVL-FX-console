import { getAdminSupabase } from "@/lib/admin-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VISIBILITY: Record<string, { label: string; color: string; bg: string }> = {
  PRIVATE:  { label: "非公開",    color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
  UNLISTED: { label: "限定公開",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:    { label: "Draft",    color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  ACTIVE:   { label: "Active",   color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  ARCHIVED: { label: "Archived", color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
};

interface StrategyRow {
  id: string;
  public_id: string;
  name: string;
  description: string | null;
  canonical_symbol: string;
  timeframes: string[];
  visibility: string;
  status: string;
  created_at: string;
  creator: { customer_code: string; display_name: string } | null;
  versions: { id: string }[];
}

async function getStrategies(): Promise<StrategyRow[]> {
  const sb = await getAdminSupabase();
  const { data } = await sb
    .from("strategy_registry")
    .select(`*, creator:creator_customer_id(customer_code, display_name), versions:strategy_versions(id)`)
    .order("created_at", { ascending: false });
  return (data ?? []) as StrategyRow[];
}

export default async function StrategiesPage() {
  const strategies = await getStrategies();

  const byStatus = Object.fromEntries(
    Object.keys(STATUS_CFG).map(s => [s, strategies.filter(x => x.status === s).length])
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "#1a1a1a" }}>Strategy Registry</h2>
          <p className="text-sm mt-1" style={{ color: "#9a9a9a" }}>
            AVL Master Strategy Registry — Public IDによる顧客間共有管理
          </p>
        </div>
        <Link href="/strategies/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff" }}>
          + Strategy を追加
        </Link>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(STATUS_CFG).map(([k, cfg]) => (
          <div key={k} className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#9a9a9a" }}>{cfg.label}</p>
            <p className="text-3xl font-black" style={{ color: cfg.color }}>{byStatus[k] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {strategies.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: "#4a4a4a" }}>Strategyがまだありません</p>
            <p className="text-xs mb-4" style={{ color: "#9a9a9a" }}>「+ Strategy を追加」から最初のStrategyを作成してください</p>
            <Link href="/strategies/new"
              className="inline-block px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: "rgba(249,115,22,0.1)", color: "#ea580c", border: "1px solid rgba(249,115,22,0.25)" }}>
              + Strategy を追加
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.02)" }}>
                {["Public ID", "Strategy名", "Symbol / TF", "公開", "状態", "バージョン", "作成者", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold" style={{ color: "#9a9a9a" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {strategies.map(s => {
                const visCfg  = VISIBILITY[s.visibility]   ?? VISIBILITY.PRIVATE;
                const statCfg = STATUS_CFG[s.status]       ?? STATUS_CFG.DRAFT;
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                    className="hover:bg-orange-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs px-2 py-1 rounded"
                        style={{ background: "rgba(124,58,237,0.06)", color: "#7c3aed" }}>
                        {s.public_id.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold" style={{ color: "#1a1a1a" }}>{s.name}</p>
                      {s.description && (
                        <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: "#9a9a9a" }}>{s.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: "#4a4a4a" }}>
                      <span className="font-bold">{s.canonical_symbol}</span>
                      <span className="ml-1" style={{ color: "#9a9a9a" }}>{s.timeframes.join(", ")}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span style={{ color: visCfg.color, background: visCfg.bg, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                        {visCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span style={{ color: statCfg.color, background: statCfg.bg, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                        {statCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold" style={{ color: "#4a4a4a" }}>
                      {s.versions.length} ver
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: "#9a9a9a" }}>
                      {s.creator ? `${s.creator.customer_code}` : "AVL"}
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/strategies/${s.id}`}
                        className="text-xs font-semibold"
                        style={{ color: "#f97316" }}>
                        詳細 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
