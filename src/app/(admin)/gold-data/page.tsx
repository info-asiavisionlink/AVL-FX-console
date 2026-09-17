import { getAdminSupabase } from "@/lib/admin-auth";
import { GoldConfigCard, type GoldConfig } from "@/components/GoldConfigCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getGoldConfigs() {
  const sb = await getAdminSupabase();
  const [{ data: configs }, { data: barStats }] = await Promise.all([
    sb.from("gold_data_config").select("*").order("created_at"),
    sb.rpc("get_bar_data_status"),
  ]);

  const statsMap = new Map<string, unknown[]>();
  if (barStats) {
    for (const row of barStats as Array<{ symbol: string }>) {
      const sym = row.symbol.toUpperCase();
      if (!statsMap.has(sym)) statsMap.set(sym, []);
      statsMap.get(sym)!.push(row);
    }
  }

  return (configs ?? []).map((cfg: Record<string, unknown>) => ({
    ...cfg,
    bar_stats: statsMap.get((cfg.canonical_symbol as string).toUpperCase()) ?? [],
  }));
}

async function getTotalBarCount() {
  const sb = await getAdminSupabase();
  const { count } = await sb.from("bar_data").select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function GoldDataPage() {
  const [configs, totalBars] = await Promise.all([getGoldConfigs(), getTotalBarCount()]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black" style={{ color: "#1a1a1a" }}>GOLDデータ管理</h2>
        <p className="text-sm mt-1" style={{ color: "#9a9a9a" }}>
          GOLD市場データの収集設定とSupabase蓄積状況
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "総蓄積バー数", value: totalBars.toLocaleString() + " 本", sub: "Console Supabase bar_data" },
          { label: "収集設定数",   value: configs.length + " 件", sub: "gold_data_config" },
          { label: "有効設定",     value: (configs as GoldConfig[]).filter(c => c.enabled).length + " 件", sub: "enabled = true" },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-5" style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <p className="text-[10px] font-semibold tracking-wide uppercase mb-2" style={{ color: "#9a9a9a" }}>{item.label}</p>
            <p className="text-2xl font-black" style={{ color: "#f97316" }}>{item.value}</p>
            <p className="text-[10px] mt-1" style={{ color: "#9a9a9a" }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Config cards */}
      {configs.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "#4a4a4a" }}>GOLDデータ設定がありません</p>
          <p className="text-xs" style={{ color: "#9a9a9a" }}>
            gold_data_configテーブルにレコードを追加してください
          </p>
        </div>
      ) : (
        (configs as GoldConfig[]).map((cfg) => (
          <GoldConfigCard key={cfg.id} config={cfg} />
        ))
      )}

      {/* Guide */}
      <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#9a9a9a" }}>データ収集フロー</p>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          {[
            "AVL管理MT5",
            "AVL_Console_DataManager.ex5",
            "Console Gateway (Railway)",
            "市場データページで「同期」",
            "Console Supabase bar_data",
          ].map((node, i, arr) => (
            <span key={node} className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl font-medium text-xs" style={{
                background: "rgba(249,115,22,0.06)",
                color: "#ea580c",
                border: "1px solid rgba(249,115,22,0.15)",
              }}>{node}</span>
              {i < arr.length - 1 && (
                <span style={{ color: "rgba(249,115,22,0.4)", fontSize: 14 }}>→</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
