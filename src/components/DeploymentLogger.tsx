"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SystemOption {
  id: string;
  system_code: string;
  system_name: string;
}

const DEPLOY_TYPES: Record<string, { label: string; color: string; icon: string }> = {
  TRADING_VIEW: { label: "Trading View",  color: "#2563eb", icon: "🌐" },
  GATEWAY:      { label: "Gateway",       color: "#7c3aed", icon: "🔀" },
  BRIDGE_EA:    { label: "Bridge EA",     color: "#ea580c", icon: "🤖" },
  SUPABASE:     { label: "Supabase",      color: "#16a34a", icon: "🗄️" },
  FULL:         { label: "Full Deploy",   color: "#1a1a1a", icon: "🚀" },
};

const STATUS_OPTS: Record<string, { label: string; color: string }> = {
  SUCCESS:     { label: "成功",       color: "#16a34a" },
  FAILED:      { label: "失敗",       color: "#dc2626" },
  ROLLED_BACK: { label: "ロールバック", color: "#d97706" },
  IN_PROGRESS: { label: "作業中",     color: "#2563eb" },
};

interface Props {
  customerId: string;
  systems: SystemOption[];
  onClose: () => void;
}

export function DeploymentLogModal({ customerId, systems, onClose }: Props) {
  const router = useRouter();
  const [f, setF] = useState({
    customer_system_id: systems[0]?.id ?? "",
    deploy_type:        "TRADING_VIEW",
    version:            "",
    bridge_version:     "",
    vercel_url:         "",
    status:             "SUCCESS",
    notes:              "",
    deployed_by:        "",
    deployed_at:        new Date().toISOString().slice(0, 16),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  const selectedSys = systems.find(s => s.id === f.customer_system_id);

  const handleSave = async () => {
    setSaving(true); setError(null);
    const payload = {
      ...f,
      system_code:    selectedSys?.system_code ?? null,
      deployed_at:    f.deployed_at ? new Date(f.deployed_at).toISOString() : new Date().toISOString(),
      bridge_version: f.deploy_type === "BRIDGE_EA" ? f.bridge_version : null,
      vercel_url:     f.deploy_type === "TRADING_VIEW" ? f.vercel_url : null,
    };
    const res = await fetch(`/api/customers/${customerId}/deployments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    router.refresh();
    onClose();
  };

  const inp: React.CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 8, fontSize: 12, outline: "none", background: "#f8f7f4", border: "1.5px solid rgba(0,0,0,0.1)", color: "#1a1a1a" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 600, marginBottom: 3, color: "#4a4a4a" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <p className="font-bold" style={{ color: "#1a1a1a" }}>デプロイを記録</p>
          <button onClick={onClose} style={{ color: "#9a9a9a", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-4" style={{ maxHeight: "72vh" }}>

          {/* System */}
          {systems.length > 0 && (
            <div>
              <label style={lbl}>対象 System</label>
              <select value={f.customer_system_id} onChange={set("customer_system_id")} style={inp}>
                <option value="">（Systemを指定しない）</option>
                {systems.map(s => (
                  <option key={s.id} value={s.id}>{s.system_code} — {s.system_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Deploy Type */}
          <div>
            <label style={lbl}>デプロイ種別 <span style={{ color: "#dc2626" }}>*</span></label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {Object.entries(DEPLOY_TYPES).map(([k, cfg]) => (
                <button key={k} type="button" onClick={() => setF(p => ({ ...p, deploy_type: k }))}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  style={{
                    background: f.deploy_type === k ? `${cfg.color}15` : "rgba(0,0,0,0.03)",
                    color: f.deploy_type === k ? cfg.color : "#9a9a9a",
                    border: f.deploy_type === k ? `1.5px solid ${cfg.color}40` : "1.5px solid transparent",
                  }}>
                  <span>{cfg.icon}</span>{cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Version fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>バージョン</label>
              <input value={f.version} onChange={set("version")} style={inp} placeholder="例: v2.1.0" />
            </div>
            {f.deploy_type === "BRIDGE_EA" && (
              <div>
                <label style={lbl}>Bridge EA バージョン</label>
                <input value={f.bridge_version} onChange={set("bridge_version")} style={inp} placeholder="例: v2.1.0" />
              </div>
            )}
            {f.deploy_type === "TRADING_VIEW" && (
              <div>
                <label style={lbl}>Vercel URL</label>
                <input value={f.vercel_url} onChange={set("vercel_url")} style={inp} placeholder="https://..." />
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label style={lbl}>ステータス</label>
            <div className="flex gap-2 mt-1">
              {Object.entries(STATUS_OPTS).map(([k, cfg]) => (
                <button key={k} type="button" onClick={() => setF(p => ({ ...p, status: k }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: f.status === k ? `${cfg.color}12` : "rgba(0,0,0,0.04)",
                    color: f.status === k ? cfg.color : "#9a9a9a",
                    border: f.status === k ? `1.5px solid ${cfg.color}35` : "1.5px solid transparent",
                  }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Datetime & By */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>デプロイ日時</label>
              <input type="datetime-local" value={f.deployed_at} onChange={set("deployed_at")} style={inp} />
            </div>
            <div>
              <label style={lbl}>実施者</label>
              <input value={f.deployed_by} onChange={set("deployed_by")} style={inp} placeholder="例: 田中慶樹" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={lbl}>メモ・変更内容</label>
            <textarea value={f.notes} onChange={set("notes")} rows={3} style={{ ...inp, resize: "vertical" }}
              placeholder="変更内容・対応内容・rollback理由など" />
          </div>

          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "記録中..." : "記録する"}
          </button>
          <button onClick={onClose} style={{ fontSize: 12, color: "#9a9a9a", cursor: "pointer" }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}
