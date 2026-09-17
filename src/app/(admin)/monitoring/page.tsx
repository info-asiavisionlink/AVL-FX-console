import { getAdminSupabase } from "@/lib/admin-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ========== 型定義 ==========
interface HealthLog {
  mt5_connected: boolean;
  active_strategy_count: number;
  bridge_version: string | null;
  mt5_account_mode: string | null;
  reported_at: string;
}

interface SystemRow {
  id: string;
  system_code: string;
  system_name: string;
  system_status: string;
  production_url: string | null;
  bridge_version: string | null;
  last_seen_at: string | null;
  last_deployed_at: string | null;
  customer: {
    id: string;
    customer_code: string;
    display_name: string;
    status: string;
    contract: {
      research_access_enabled: boolean;
      research_access_expires_at: string | null;
      management_status: string;
    } | null;
  } | null;
}

// ========== ステータス計算 ==========
type OnlineStatus = "ONLINE" | "STALE" | "OFFLINE" | "UNKNOWN";

function calcOnlineStatus(lastSeen: string | null): OnlineStatus {
  if (!lastSeen) return "UNKNOWN";
  const mins = (Date.now() - new Date(lastSeen).getTime()) / 60_000;
  if (mins < 5)  return "ONLINE";
  if (mins < 60) return "STALE";
  return "OFFLINE";
}

const ONLINE_CFG: Record<OnlineStatus, { label: string; color: string; bg: string; dot: string }> = {
  ONLINE:  { label: "Online",  color: "#16a34a", bg: "rgba(22,163,74,0.08)",  dot: "#16a34a" },
  STALE:   { label: "Stale",   color: "#d97706", bg: "rgba(217,119,6,0.08)",  dot: "#d97706" },
  OFFLINE: { label: "Offline", color: "#dc2626", bg: "rgba(220,38,38,0.08)",  dot: "#dc2626" },
  UNKNOWN: { label: "Unknown", color: "#9a9a9a", bg: "rgba(0,0,0,0.05)",      dot: "#d0d0d0" },
};

const SYS_STATUS_CFG: Record<string, { label: string; color: string }> = {
  BUILDING:    { label: "構築中",   color: "#9a9a9a" },
  TESTING:     { label: "テスト中", color: "#7c3aed" },
  LIVE:        { label: "稼働中",   color: "#16a34a" },
  SUSPENDED:   { label: "停止中",   color: "#dc2626" },
  TRANSFERRED: { label: "移管済み", color: "#9a9a9a" },
};

type ContractInfo = { research_access_enabled: boolean; research_access_expires_at: string | null; management_status: string } | null;

function researchStatus(contract: ContractInfo) {
  if (!contract?.research_access_enabled) return { label: "無効", color: "#9a9a9a" };
  if (!contract.research_access_expires_at) return { label: "有効（無期限）", color: "#16a34a" };
  const d = new Date(contract.research_access_expires_at);
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0)  return { label: "期限切れ", color: "#dc2626" };
  if (days < 30) return { label: `残り${days}日`, color: "#d97706" };
  return { label: `有効 (${d.toLocaleDateString("ja-JP")}まで)`, color: "#16a34a" };
}

function fmtRelative(ts: string | null): string {
  if (!ts) return "―";
  const mins = (Date.now() - new Date(ts).getTime()) / 60_000;
  if (mins < 1)   return "今";
  if (mins < 60)  return `${Math.floor(mins)}分前`;
  const hrs = mins / 60;
  if (hrs < 24)   return `${Math.floor(hrs)}時間前`;
  return `${Math.floor(hrs / 24)}日前`;
}

// ========== データ取得 ==========
async function getData() {
  const sb = await getAdminSupabase();

  const { data: systems } = await sb
    .from("customer_systems")
    .select(`
      id, system_code, system_name, system_status,
      production_url, bridge_version, last_seen_at, last_deployed_at,
      customer:customer_id (
        id, customer_code, display_name, status,
        contract:customer_contracts (
          research_access_enabled, research_access_expires_at, management_status
        )
      )
    `)
    .order("created_at");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (systems ?? []) as unknown as SystemRow[];

  // 各Systemの最新ヘルスログ
  const healthMap: Record<string, HealthLog> = {};
  for (const sys of rows) {
    const { data: log } = await sb
      .from("system_health_logs")
      .select("mt5_connected, active_strategy_count, bridge_version, mt5_account_mode, reported_at")
      .eq("customer_system_id", sys.id)
      .order("reported_at", { ascending: false })
      .limit(1)
      .single();
    if (log) healthMap[sys.id] = log as HealthLog;
  }

  return { rows, healthMap };
}

// ========== Page ==========
export default async function MonitoringPage() {
  const { rows, healthMap } = await getData();

  const statusCounts = { ONLINE: 0, STALE: 0, OFFLINE: 0, UNKNOWN: 0 };
  for (const s of rows) {
    const st = calcOnlineStatus(s.last_seen_at);
    statusCounts[st]++;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black" style={{ color: "#1a1a1a" }}>System Monitoring</h2>
        <p className="text-sm mt-1" style={{ color: "#9a9a9a" }}>
          顧客 Trading System の稼働状態（Heartbeat: <code className="text-xs">POST /api/monitoring/report</code>）
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {(["ONLINE","STALE","OFFLINE","UNKNOWN"] as OnlineStatus[]).map(st => {
          const cfg = ONLINE_CFG[st];
          return (
            <div key={st} className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <p className="text-3xl font-black" style={{ color: cfg.color }}>{statusCounts[st]}</p>
            </div>
          );
        })}
      </div>

      {/* Systems */}
      {rows.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "#4a4a4a" }}>Systemがまだ登録されていません</p>
          <p className="text-xs mb-4" style={{ color: "#9a9a9a" }}>顧客詳細ページから「専用Systemセット」を追加してください</p>
          <Link href="/customers" className="text-sm font-semibold" style={{ color: "#f97316" }}>顧客一覧 →</Link>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.02)" }}>
                {["稼働", "顧客", "System", "MT5", "Bridge", "Strategy数", "最終確認", "Research", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold" style={{ color: "#9a9a9a" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(sys => {
                const onlineSt = calcOnlineStatus(sys.last_seen_at);
                const onlineCfg = ONLINE_CFG[onlineSt];
                const sysStatCfg = SYS_STATUS_CFG[sys.system_status] ?? SYS_STATUS_CFG.BUILDING;
                const health = healthMap[sys.id];
                const resCfg = researchStatus((sys.customer as { contract?: ContractInfo })?.contract ?? null);
                const contractBridge = health?.bridge_version ?? sys.bridge_version;

                return (
                  <tr key={sys.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                    className="hover:bg-orange-50 transition-colors">

                    {/* 稼働状態 */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${onlineSt === "ONLINE" ? "animate-pulse" : ""}`}
                          style={{ background: onlineCfg.dot }} />
                        <span style={{ color: onlineCfg.color, background: onlineCfg.bg, padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                          {onlineCfg.label}
                        </span>
                      </div>
                    </td>

                    {/* 顧客 */}
                    <td className="px-4 py-4">
                      {sys.customer ? (
                        <Link href={`/customers/${sys.customer.id}`}>
                          <p className="font-semibold text-xs" style={{ color: "#f97316" }}>{sys.customer.customer_code}</p>
                          <p className="text-xs" style={{ color: "#9a9a9a" }}>{sys.customer.display_name}</p>
                        </Link>
                      ) : <span style={{ color: "#9a9a9a" }}>―</span>}
                    </td>

                    {/* System */}
                    <td className="px-4 py-4">
                      <p className="font-semibold text-xs" style={{ color: "#1a1a1a" }}>{sys.system_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px]" style={{ color: "#9a9a9a" }}>{sys.system_code}</span>
                        <span style={{ color: sysStatCfg.color, fontSize: 9, fontWeight: 700 }}>• {sysStatCfg.label}</span>
                      </div>
                      {sys.production_url && (
                        <a href={sys.production_url} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] mt-0.5 block truncate max-w-[140px]" style={{ color: "#9a9a9a" }}>
                          {sys.production_url.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </td>

                    {/* MT5 */}
                    <td className="px-4 py-4">
                      {health ? (
                        <div>
                          <span style={{
                            color: health.mt5_connected ? "#16a34a" : "#dc2626",
                            background: health.mt5_connected ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
                            padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                          }}>
                            {health.mt5_connected ? "接続中" : "切断"}
                          </span>
                          {health.mt5_account_mode && (
                            <p className="text-[10px] mt-0.5" style={{ color: "#9a9a9a" }}>{health.mt5_account_mode}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "#d0d0d0" }}>―</span>
                      )}
                    </td>

                    {/* Bridge version */}
                    <td className="px-4 py-4 text-xs" style={{ color: "#4a4a4a" }}>
                      {contractBridge ?? <span style={{ color: "#d0d0d0" }}>―</span>}
                    </td>

                    {/* Strategy数 */}
                    <td className="px-4 py-4 text-sm font-semibold" style={{ color: "#4a4a4a" }}>
                      {health ? health.active_strategy_count : <span className="text-xs" style={{ color: "#d0d0d0" }}>―</span>}
                    </td>

                    {/* 最終確認 */}
                    <td className="px-4 py-4">
                      <p className="text-xs" style={{ color: "#4a4a4a" }}>{fmtRelative(sys.last_seen_at)}</p>
                      {sys.last_deployed_at && (
                        <p className="text-[10px] mt-0.5" style={{ color: "#9a9a9a" }}>デプロイ: {fmtRelative(sys.last_deployed_at)}</p>
                      )}
                    </td>

                    {/* Research Access */}
                    <td className="px-4 py-4">
                      <span style={{ color: resCfg.color, fontSize: 10, fontWeight: 700 }}>{resCfg.label}</span>
                    </td>

                    {/* 詳細リンク */}
                    <td className="px-4 py-4">
                      {sys.customer && (
                        <Link href={`/customers/${sys.customer.id}`}
                          className="text-xs font-semibold" style={{ color: "#f97316" }}>
                          詳細 →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Heartbeat ガイド */}
      <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#9a9a9a" }}>Heartbeat 設定ガイド</p>
        <p className="text-xs mb-3" style={{ color: "#4a4a4a" }}>
          顧客 Trading Gateway から定期的に以下のエンドポイントへ POST することで稼働状態が更新されます。
        </p>
        <pre className="text-xs rounded-xl p-4 overflow-auto" style={{ background: "#f8f7f4", color: "#4a4a4a", fontFamily: "monospace" }}>
{`POST https://avl-fx-console.vercel.app/api/monitoring/report
X-System-Token: rtk_xxxxxxxxxxxx

{
  "gateway_online": true,
  "mt5_connected": true,
  "mt5_account_mode": "HEDGING",
  "bridge_version": "v2.1.0",
  "active_strategy_count": 2
}`}
        </pre>
        <p className="text-xs mt-3" style={{ color: "#9a9a9a" }}>
          推奨: 30秒〜1分ごとに送信。ONLINE判定 = 5分以内に受信。STALE = 5〜60分。OFFLINE = 60分超。
        </p>
      </div>
    </div>
  );
}
