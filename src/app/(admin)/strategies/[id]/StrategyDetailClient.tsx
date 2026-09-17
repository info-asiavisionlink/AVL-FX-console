"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TF_OPTIONS = ["M1","M5","M15","M30","H1","H4","D1","W1"];

interface Strategy {
  id: string;
  public_id: string;
  name: string;
  description: string | null;
  canonical_symbol: string;
  timeframes: string[];
  spec: Record<string, unknown>;
  visibility: string;
  status: string;
  creator_customer_id: string | null;
  created_at: string;
  updated_at: string;
  creator: { customer_code: string; display_name: string } | null;
  versions: { id: string; version: number; change_notes: string | null; created_at: string }[];
  shares: {
    id: string; source_version: number; imported_at: string | null; created_at: string;
    target_customer: { customer_code: string; display_name: string } | null;
  }[];
}

const VISIBILITY: Record<string, { label: string; color: string; bg: string }> = {
  PRIVATE:  { label: "非公開",   color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
  UNLISTED: { label: "限定公開", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
};
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:    { label: "Draft",    color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  ACTIVE:   { label: "Active",   color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  ARCHIVED: { label: "Archived", color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
};

function Badge({ cfg }: { cfg: { label: string; color: string; bg: string } }) {
  return (
    <span style={{ color: cfg.color, background: cfg.bg, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

// ====================== Edit Modal ======================
function EditModal({ strategy, onClose }: { strategy: Strategy; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    name:           strategy.name,
    description:    strategy.description ?? "",
    timeframes:     strategy.timeframes,
    spec:           JSON.stringify(strategy.spec, null, 2),
    visibility:     strategy.visibility,
    status:         strategy.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  const toggleTF = (tf: string) =>
    setF(prev => ({
      ...prev,
      timeframes: prev.timeframes.includes(tf)
        ? prev.timeframes.filter(x => x !== tf)
        : [...prev.timeframes, tf],
    }));

  const handleSave = async () => {
    setSaving(true); setError(null);
    let spec: unknown;
    try { spec = JSON.parse(f.spec); } catch { setError("Spec は有効な JSON で入力してください"); setSaving(false); return; }
    const res = await fetch(`/api/strategies/${strategy.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, spec }),
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
      <div className="w-full max-w-xl rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <p className="font-bold" style={{ color: "#1a1a1a" }}>Strategy を編集</p>
          <button onClick={onClose} style={{ color: "#9a9a9a", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div className="px-6 py-4 overflow-y-auto space-y-4" style={{ maxHeight: "72vh" }}>
          <div><label style={lbl}>Strategy名</label><input value={f.name} onChange={set("name")} style={inp} /></div>
          <div><label style={lbl}>説明</label><textarea value={f.description} onChange={set("description")} rows={2} style={{ ...inp, resize: "vertical" }} /></div>

          <div>
            <label style={lbl}>Timeframes</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TF_OPTIONS.map(tf => (
                <button key={tf} type="button" onClick={() => toggleTF(tf)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-colors"
                  style={{
                    background: f.timeframes.includes(tf) ? "rgba(249,115,22,0.12)" : "rgba(0,0,0,0.04)",
                    color: f.timeframes.includes(tf) ? "#ea580c" : "#9a9a9a",
                    border: f.timeframes.includes(tf) ? "1.5px solid rgba(249,115,22,0.3)" : "1.5px solid transparent",
                  }}>
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>公開範囲</label>
              <select value={f.visibility} onChange={set("visibility")} style={inp}>
                <option value="PRIVATE">非公開</option>
                <option value="UNLISTED">限定公開</option>
              </select>
            </div>
            <div>
              <label style={lbl}>ステータス</label>
              <select value={f.status} onChange={set("status")} style={inp}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label style={lbl}>Spec（JSON）</label>
            <textarea value={f.spec} onChange={set("spec")} rows={10}
              style={{ ...inp, fontFamily: "monospace", fontSize: 11, resize: "vertical" }} />
          </div>

          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "保存中..." : "保存"}
          </button>
          <button onClick={onClose} style={{ fontSize: 12, color: "#9a9a9a", cursor: "pointer" }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// ====================== Save Version Modal ======================
function SaveVersionModal({ strategyId, onClose }: { strategyId: string; onClose: () => void }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/strategies/${strategyId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ change_notes: notes }),
    });
    router.refresh();
    onClose();
  };

  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13, outline: "none", background: "#f8f7f4", border: "1.5px solid rgba(0,0,0,0.1)", color: "#1a1a1a" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <p className="font-bold" style={{ color: "#1a1a1a" }}>バージョンを保存</p>
          <button onClick={onClose} style={{ color: "#9a9a9a", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs" style={{ color: "#9a9a9a" }}>現在の Spec をスナップショットとして保存します。</p>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 3, color: "#4a4a4a" }}>変更メモ（任意）</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} style={inp} placeholder="例: エントリー条件を調整" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "保存中..." : "バージョンを保存"}
          </button>
          <button onClick={onClose} style={{ fontSize: 12, color: "#9a9a9a", cursor: "pointer" }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// ====================== Main ======================
export function StrategyDetailClient({ strategy }: { strategy: Strategy }) {
  const [editing, setEditing]       = useState(false);
  const [savingVer, setSavingVer]   = useState(false);
  const [copied, setCopied]         = useState(false);

  const visCfg  = VISIBILITY[strategy.visibility]  ?? VISIBILITY.PRIVATE;
  const statCfg = STATUS_CFG[strategy.status]      ?? STATUS_CFG.DRAFT;

  const copyPublicId = () => {
    navigator.clipboard.writeText(strategy.public_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      {editing    && <EditModal strategy={strategy} onClose={() => setEditing(false)} />}
      {savingVer  && <SaveVersionModal strategyId={strategy.id} onClose={() => setSavingVer(false)} />}

      <div className="space-y-6">
        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button onClick={() => setSavingVer(true)}
            style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgba(22,163,74,0.08)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)", cursor: "pointer" }}>
            バージョンを保存
          </button>
          <button onClick={() => setEditing(true)}
            style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgba(249,115,22,0.08)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)", cursor: "pointer" }}>
            編集
          </button>
        </div>

        {/* Public ID */}
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#9a9a9a" }}>Public ID</p>
          <div className="flex items-center gap-3">
            <code className="text-sm font-mono px-3 py-2 rounded-xl flex-1" style={{ background: "rgba(124,58,237,0.06)", color: "#7c3aed" }}>
              {strategy.public_id}
            </code>
            <button onClick={copyPublicId}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(124,58,237,0.08)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.2)", cursor: "pointer", whiteSpace: "nowrap" }}>
              {copied ? "コピー済み ✓" : "コピー"}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>基本情報</p>
            {[
              { label: "Symbol",  value: strategy.canonical_symbol },
              { label: "TF",      value: strategy.timeframes.join(", ") },
              { label: "作成者",  value: strategy.creator ? `${strategy.creator.customer_code} ${strategy.creator.display_name}` : "AVL" },
              { label: "作成日",  value: new Date(strategy.created_at).toLocaleDateString("ja-JP") },
              { label: "更新日",  value: new Date(strategy.updated_at).toLocaleDateString("ja-JP") },
            ].map(r => (
              <div key={r.label} className="flex justify-between py-2 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                <span className="text-xs font-medium" style={{ color: "#9a9a9a" }}>{r.label}</span>
                <span className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>{r.value}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
              <span className="text-xs font-medium" style={{ color: "#9a9a9a" }}>公開範囲</span>
              <Badge cfg={visCfg} />
            </div>
            <div className="flex justify-between py-2" >
              <span className="text-xs font-medium" style={{ color: "#9a9a9a" }}>状態</span>
              <Badge cfg={statCfg} />
            </div>
          </div>

          {/* Spec */}
          <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#9a9a9a" }}>Spec</p>
            <pre className="text-xs overflow-auto rounded-lg p-3" style={{ background: "#f8f7f4", color: "#4a4a4a", maxHeight: 220, fontFamily: "monospace" }}>
              {JSON.stringify(strategy.spec, null, 2)}
            </pre>
          </div>
        </div>

        {/* Version History */}
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>バージョン履歴</p>
            <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.05)", color: "#9a9a9a" }}>
              {strategy.versions.length} バージョン
            </span>
          </div>
          {strategy.versions.length === 0 ? (
            <p className="text-xs" style={{ color: "#9a9a9a" }}>まだバージョンが保存されていません。「バージョンを保存」で現在の Spec をスナップショット保存できます。</p>
          ) : (
            <div className="space-y-2">
              {[...strategy.versions].sort((a, b) => b.version - a.version).map(v => (
                <div key={v.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl" style={{ background: "rgba(0,0,0,0.02)" }}>
                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(249,115,22,0.08)", color: "#ea580c" }}>
                    v{v.version}
                  </span>
                  <span className="text-xs flex-1" style={{ color: "#4a4a4a" }}>{v.change_notes ?? "―"}</span>
                  <span className="text-xs" style={{ color: "#9a9a9a" }}>{new Date(v.created_at).toLocaleDateString("ja-JP")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shares */}
        {strategy.shares.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>共有履歴</p>
              <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.05)", color: "#9a9a9a" }}>
                {strategy.shares.length} 件
              </span>
            </div>
            <div className="space-y-2">
              {strategy.shares.map(sh => (
                <div key={sh.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl" style={{ background: "rgba(0,0,0,0.02)" }}>
                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(124,58,237,0.06)", color: "#7c3aed" }}>
                    v{sh.source_version}
                  </span>
                  <span className="text-xs flex-1" style={{ color: "#4a4a4a" }}>
                    → {sh.target_customer ? `${sh.target_customer.customer_code} ${sh.target_customer.display_name}` : "―"}
                  </span>
                  <span className="text-xs" style={{ color: "#9a9a9a" }}>
                    {sh.imported_at ? new Date(sh.imported_at).toLocaleDateString("ja-JP") : "Import待ち"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
