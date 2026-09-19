import { getAdminSupabase } from "@/lib/admin-auth";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

const TYPE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  SCALPING:  { label: "スキャル",  color: "#2563eb", bg: "rgba(37,99,235,0.08)"  },
  DAY_TRADE: { label: "デイトレ",  color: "#d97706", bg: "rgba(217,119,6,0.08)"  },
  SWING:     { label: "スイング",  color: "#f97316", bg: "rgba(249,115,22,0.08)" },
};

interface EARow {
  id:              string;
  share_code:      string;
  tv_strategy_id:  string;
  tv_user_id:      string | null;
  name:            string;
  strategy_type:   string;
  spec:            Record<string, unknown>;
  backtest_result: Record<string, unknown> | null;
  raw_prompt:      string | null;
  created_at:      string;
}

async function getEAList(): Promise<EARow[]> {
  const sb = await getAdminSupabase();
  const { data } = await sb
    .from("ea_registry")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as EARow[];
}

export default async function EAListPage() {
  const eas = await getEAList();

  const byType = Object.fromEntries(
    Object.keys(TYPE_CFG).map(t => [t, eas.filter(e => e.strategy_type === t).length])
  );

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-2xl font-black" style={{ color: "#1a1a1a" }}>EA リスト</h2>
        <p className="text-sm mt-1" style={{ color: "#9a9a9a" }}>
          ユーザーが作成した EA の識別番号一覧 — 合計 {eas.length} 件
        </p>
      </div>

      {/* 種別サマリー */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(TYPE_CFG).map(([k, cfg]) => (
          <div key={k} className="rounded-2xl p-4"
            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#9a9a9a" }}>{cfg.label}</p>
            <p className="text-3xl font-black" style={{ color: cfg.color }}>{byType[k] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* テーブル */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {eas.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: "#4a4a4a" }}>EA がまだ登録されていません</p>
            <p className="text-xs" style={{ color: "#9a9a9a" }}>Trading View でユーザーが EA を追加すると自動的にここに登録されます</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.02)" }}>
                {["識別番号（16桁）", "EA名", "種別", "バックテスト", "登録日時"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold" style={{ color: "#9a9a9a" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eas.map(ea => {
                const typeCfg = TYPE_CFG[ea.strategy_type] ?? TYPE_CFG.SCALPING;
                const bt      = ea.backtest_result;
                const verdict = bt ? (bt.verdict as string | null) : null;
                const verdictColor =
                  verdict === "PASSED"      ? "#16a34a" :
                  verdict === "CONDITIONAL" ? "#d97706" :
                  verdict === "FAILED"      ? "#dc2626" : "#9a9a9a";
                const verdictLabel =
                  verdict === "PASSED"      ? "合格" :
                  verdict === "CONDITIONAL" ? "条件付" :
                  verdict === "FAILED"      ? "不合格" : "未実施";

                const specObj = ea.spec as Record<string, unknown>;
                const syms    = (specObj.symbols as string[] | undefined) ?? [];
                const tfs     = (specObj.timeframes as string[] | undefined) ?? [];

                return (
                  <tr key={ea.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                    className="hover:bg-orange-50 transition-colors">
                    {/* 識別番号 */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm font-black tracking-widest px-2 py-1 rounded select-all"
                        style={{ background: "rgba(249,115,22,0.06)", color: "#f97316", border: "1px solid rgba(249,115,22,0.20)" }}>
                        {ea.share_code}
                      </span>
                    </td>
                    {/* EA名 */}
                    <td className="px-5 py-4">
                      <p className="font-semibold" style={{ color: "#1a1a1a" }}>{ea.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9a9a9a" }}>
                        {syms.join(", ")} / {tfs.join(", ")}
                      </p>
                    </td>
                    {/* 種別 */}
                    <td className="px-5 py-4">
                      <span style={{ color: typeCfg.color, background: typeCfg.bg, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                        {typeCfg.label}
                      </span>
                    </td>
                    {/* バックテスト */}
                    <td className="px-5 py-4">
                      {bt ? (
                        <div className="space-y-0.5">
                          <span style={{ color: verdictColor, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${verdictColor}15` }}>
                            {verdictLabel}
                          </span>
                          {bt.total_pips !== undefined && (
                            <p className="text-xs font-mono" style={{ color: Number(bt.total_pips) >= 0 ? "#f97316" : "#dc2626" }}>
                              {Number(bt.total_pips) >= 0 ? "+" : ""}{Number(bt.total_pips).toFixed(1)} pips
                            </p>
                          )}
                          {bt.win_rate !== undefined && (
                            <p className="text-xs" style={{ color: "#9a9a9a" }}>
                              WR: {Number(bt.win_rate).toFixed(0)}%
                              {bt.profit_factor !== null && bt.profit_factor !== undefined && (
                                <span className="ml-2">PF: {Number(bt.profit_factor).toFixed(2)}</span>
                              )}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "#9a9a9a" }}>未実施</span>
                      )}
                    </td>
                    {/* 登録日時 */}
                    <td className="px-5 py-4 text-xs" style={{ color: "#9a9a9a" }}>
                      {new Date(ea.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
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
