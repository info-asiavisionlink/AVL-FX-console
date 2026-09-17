"use client";

import { useState } from "react";
import { DeploymentLogModal } from "@/components/DeploymentLogger";

interface DeployRow {
  id: string;
  customer_system_id: string | null;
  system_code: string | null;
  deploy_type: string;
  version: string | null;
  bridge_version: string | null;
  vercel_url: string | null;
  status: string;
  notes: string | null;
  deployed_by: string | null;
  deployed_at: string;
}

interface SystemOption {
  id: string;
  system_code: string;
  system_name: string;
}

const DEPLOY_TYPES: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  TRADING_VIEW: { label: "Trading View", color: "#2563eb", bg: "rgba(37,99,235,0.08)",  icon: "🌐" },
  GATEWAY:      { label: "Gateway",      color: "#7c3aed", bg: "rgba(124,58,237,0.08)", icon: "🔀" },
  BRIDGE_EA:    { label: "Bridge EA",    color: "#ea580c", bg: "rgba(234,88,12,0.08)",  icon: "🤖" },
  SUPABASE:     { label: "Supabase",     color: "#16a34a", bg: "rgba(22,163,74,0.08)",  icon: "🗄️" },
  FULL:         { label: "Full Deploy",  color: "#1a1a1a", bg: "rgba(0,0,0,0.06)",      icon: "🚀" },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  SUCCESS:     { label: "成功",        color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  FAILED:      { label: "失敗",        color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
  ROLLED_BACK: { label: "ロールバック", color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  IN_PROGRESS: { label: "作業中",      color: "#2563eb", bg: "rgba(37,99,235,0.08)" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function DeploymentsClient({ deployments, systems, customerId }: {
  deployments: DeployRow[];
  systems: SystemOption[];
  customerId: string;
}) {
  const [logging, setLogging] = useState(false);

  // 種別ごとの件数
  const typeCounts = Object.keys(DEPLOY_TYPES).map(k => ({
    key: k, cfg: DEPLOY_TYPES[k], count: deployments.filter(d => d.deploy_type === k).length,
  }));

  return (
    <>
      {logging && <DeploymentLogModal customerId={customerId} systems={systems} onClose={() => setLogging(false)} />}

      <div className="space-y-5">
        {/* 統計 */}
        <div className="grid grid-cols-5 gap-3">
          {typeCounts.map(({ key, cfg, count }) => (
            <div key={key} className="rounded-2xl p-3 text-center" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <p className="text-base mb-0.5">{cfg.icon}</p>
              <p className="text-xs font-semibold mb-1" style={{ color: "#9a9a9a" }}>{cfg.label}</p>
              <p className="text-2xl font-black" style={{ color: cfg.color }}>{count}</p>
            </div>
          ))}
        </div>

        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: "#4a4a4a" }}>
            全 {deployments.length} 件
          </p>
          <button onClick={() => setLogging(true)}
            style={{ padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", cursor: "pointer" }}>
            + デプロイを記録
          </button>
        </div>

        {/* タイムライン */}
        {deployments.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "#fff", border: "2px dashed rgba(249,115,22,0.2)" }}>
            <p className="text-2xl mb-3">🚀</p>
            <p className="text-sm font-semibold mb-1" style={{ color: "#4a4a4a" }}>デプロイ履歴がありません</p>
            <p className="text-xs mb-4" style={{ color: "#9a9a9a" }}>「+ デプロイを記録」からデプロイを記録してください</p>
            <button onClick={() => setLogging(true)}
              style={{ padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "rgba(249,115,22,0.1)", color: "#ea580c", border: "1px solid rgba(249,115,22,0.25)", cursor: "pointer" }}>
              + デプロイを記録
            </button>
          </div>
        ) : (
          <div className="space-y-0 relative">
            {/* タイムラインライン */}
            <div className="absolute left-6 top-8 bottom-8 w-px" style={{ background: "rgba(0,0,0,0.08)" }} />

            {deployments.map((d, i) => {
              const typeCfg   = DEPLOY_TYPES[d.deploy_type] ?? DEPLOY_TYPES.FULL;
              const statusCfg = STATUS_CFG[d.status]         ?? STATUS_CFG.SUCCESS;
              const isFirst   = i === 0;

              return (
                <div key={d.id} className="relative flex gap-4 pb-5">
                  {/* ドット */}
                  <div className="relative z-10 w-12 flex-shrink-0 flex justify-center pt-3">
                    <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                      style={{ background: statusCfg.color }}>
                      {d.status === "FAILED" && <span style={{ fontSize: 8, color: "#fff", fontWeight: 900 }}>×</span>}
                      {d.status === "ROLLED_BACK" && <span style={{ fontSize: 7, color: "#fff", fontWeight: 900 }}>↩</span>}
                    </div>
                  </div>

                  {/* カード */}
                  <div className="flex-1 rounded-2xl p-4" style={{
                    background: "#fff",
                    border: isFirst ? "1.5px solid rgba(249,115,22,0.2)" : "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 種別バッジ */}
                        <span style={{ color: typeCfg.color, background: typeCfg.bg, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                          {typeCfg.icon} {typeCfg.label}
                        </span>
                        {/* ステータスバッジ */}
                        <span style={{ color: statusCfg.color, background: statusCfg.bg, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                          {statusCfg.label}
                        </span>
                        {/* System */}
                        {d.system_code && (
                          <span className="text-xs font-mono" style={{ color: "#9a9a9a" }}>{d.system_code}</span>
                        )}
                        {isFirst && (
                          <span style={{ color: "#f97316", background: "rgba(249,115,22,0.08)", padding: "1px 7px", borderRadius: 99, fontSize: 9, fontWeight: 700 }}>最新</span>
                        )}
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: "#9a9a9a" }}>{fmtDate(d.deployed_at)}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {d.version && (
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                          style={{ background: "rgba(0,0,0,0.04)", color: "#4a4a4a" }}>
                          {d.version}
                        </span>
                      )}
                      {d.bridge_version && (
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                          style={{ background: "rgba(234,88,12,0.06)", color: "#ea580c" }}>
                          Bridge {d.bridge_version}
                        </span>
                      )}
                      {d.deployed_by && (
                        <span className="text-xs" style={{ color: "#9a9a9a" }}>by {d.deployed_by}</span>
                      )}
                    </div>

                    {d.vercel_url && (
                      <a href={d.vercel_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs mt-1.5 block truncate" style={{ color: "#2563eb" }}>
                        {d.vercel_url}
                      </a>
                    )}

                    {d.notes && (
                      <p className="text-xs mt-2 pt-2 border-t whitespace-pre-wrap" style={{ borderColor: "rgba(0,0,0,0.05)", color: "#4a4a4a" }}>
                        {d.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
