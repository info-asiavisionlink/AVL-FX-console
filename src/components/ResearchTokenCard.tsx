"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Token {
  id: string;
  token_name: string;
  token: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  customer_system_id: string | null;
  notes: string | null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy}
      style={{ padding: "2px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "rgba(124,58,237,0.08)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.15)", cursor: "pointer", whiteSpace: "nowrap" }}>
      {copied ? "✓" : "コピー"}
    </button>
  );
}

// ====================== Issue Modal ======================
function IssueTokenModal({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({ token_name: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<Token | null>(null);

  const inp: React.CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 8, fontSize: 12, outline: "none", background: "#f8f7f4", border: "1.5px solid rgba(0,0,0,0.1)", color: "#1a1a1a" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 600, marginBottom: 3, color: "#4a4a4a" };

  const handleIssue = async () => {
    setSaving(true);
    const res = await fetch(`/api/customers/${customerId}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const data = await res.json();
    if (res.ok) { setIssued(data); router.refresh(); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <p className="font-bold" style={{ color: "#1a1a1a" }}>Research Token を発行</p>
          <button onClick={onClose} style={{ color: "#9a9a9a", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        {issued ? (
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-xl p-4" style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}>
              <p className="text-xs font-bold mb-2" style={{ color: "#16a34a" }}>✓ トークンが発行されました</p>
              <p className="text-[11px] mb-3" style={{ color: "#4a4a4a" }}>このトークンは一度しか表示されません。今すぐコピーして安全な場所に保管してください。</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono flex-1 px-2 py-1.5 rounded" style={{ background: "#f8f7f4", color: "#7c3aed", wordBreak: "break-all" }}>
                  {issued.token}
                </code>
                <CopyButton text={issued.token} />
              </div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.03)" }}>
              <p className="text-[10px] font-bold mb-1" style={{ color: "#9a9a9a" }}>Trading View 側での使用方法</p>
              <code className="text-[10px] font-mono" style={{ color: "#4a4a4a" }}>
                X-Research-Token: {issued.token.slice(0, 12)}...
              </code>
            </div>
            <button onClick={onClose} style={{ width: "100%", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgba(0,0,0,0.06)", color: "#4a4a4a", cursor: "pointer" }}>
              閉じる
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 space-y-3">
              <div><label style={lbl}>トークン名 <span style={{ color: "#dc2626" }}>*</span></label>
                <input value={f.token_name} onChange={e => setF(p => ({ ...p, token_name: e.target.value }))} style={inp} placeholder="例: Trading View本番用" />
              </div>
              <div><label style={lbl}>メモ</label>
                <input value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} style={inp} placeholder="任意" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <button onClick={handleIssue} disabled={saving || !f.token_name}
                style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", cursor: (saving || !f.token_name) ? "not-allowed" : "pointer", opacity: (saving || !f.token_name) ? 0.6 : 1 }}>
                {saving ? "発行中..." : "発行"}
              </button>
              <button onClick={onClose} style={{ fontSize: 12, color: "#9a9a9a", cursor: "pointer" }}>キャンセル</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ====================== Main ======================
export function ResearchTokenCard({ tokens, customerId }: { tokens: Token[]; customerId: string }) {
  const router = useRouter();
  const [issuing, setIssuing]     = useState(false);
  const [revoking, setRevoking]   = useState<string | null>(null);

  const handleRevoke = async (tokenId: string) => {
    if (!confirm("このトークンを失効させますか？失効後は即座に使用不可になります。")) return;
    setRevoking(tokenId);
    await fetch(`/api/customers/${customerId}/tokens/${tokenId}`, { method: "DELETE" });
    router.refresh();
    setRevoking(null);
  };

  const active   = tokens.filter(t => t.is_active);
  const revoked  = tokens.filter(t => !t.is_active);

  return (
    <>
      {issuing && <IssueTokenModal customerId={customerId} onClose={() => setIssuing(false)} />}

      <div className="rounded-2xl p-5 space-y-4" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>Research API トークン</p>
            <p className="text-xs mt-0.5" style={{ color: "#9a9a9a" }}>Trading View → Research API 認証用。Service Role Keyの代替。</p>
          </div>
          <button onClick={() => setIssuing(true)}
            style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(249,115,22,0.08)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)", cursor: "pointer" }}>
            + トークン発行
          </button>
        </div>

        {active.length === 0 && revoked.length === 0 ? (
          <div className="text-center py-6" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
            <p className="text-xs" style={{ color: "#9a9a9a" }}>まだトークンがありません。「+ トークン発行」から作成してください。</p>
          </div>
        ) : (
          <div className="space-y-2" style={{ borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: 12 }}>
            {active.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(22,163,74,0.04)", border: "1px solid rgba(22,163,74,0.12)" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#16a34a" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold" style={{ color: "#1a1a1a" }}>{t.token_name}</p>
                  <p className="text-[10px]" style={{ color: "#9a9a9a" }}>
                    {t.last_used_at ? `最終使用: ${new Date(t.last_used_at).toLocaleDateString("ja-JP")}` : "未使用"}
                    　作成: {new Date(t.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
                <code className="text-[10px] font-mono px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.04)", color: "#9a9a9a" }}>
                  {t.token.slice(0, 10)}…
                </code>
                <button onClick={() => handleRevoke(t.id)} disabled={revoking === t.id}
                  style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {revoking === t.id ? "失効中…" : "失効"}
                </button>
              </div>
            ))}
            {revoked.length > 0 && (
              <details className="mt-2">
                <summary className="text-[10px] cursor-pointer" style={{ color: "#9a9a9a" }}>失効済み ({revoked.length}件)</summary>
                <div className="space-y-1 mt-2">
                  {revoked.map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "rgba(0,0,0,0.02)" }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#d0d0d0" }} />
                      <p className="text-xs flex-1" style={{ color: "#9a9a9a" }}>{t.token_name}</p>
                      <code className="text-[10px] font-mono" style={{ color: "#d0d0d0" }}>{t.token.slice(0, 10)}…</code>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* エンドポイント情報 */}
        <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(0,0,0,0.02)", borderTop: "1px solid rgba(0,0,0,0.05)", marginTop: 8 }}>
          <p className="text-[9px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9a9a9a" }}>Research API エンドポイント</p>
          {[
            { method: "GET",  path: "/api/research/status",   desc: "アクセス権確認" },
            { method: "POST", path: "/api/research/bars",      desc: "Historical Data取得（最大5,000本）" },
            { method: "POST", path: "/api/research/backtest",  desc: "Backtest実行" },
          ].map(e => (
            <div key={e.path} className="flex items-center gap-2">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed", minWidth: 32, textAlign: "center" }}>{e.method}</span>
              <code className="text-[10px] font-mono" style={{ color: "#4a4a4a" }}>{e.path}</code>
              <span className="text-[10px]" style={{ color: "#9a9a9a" }}>— {e.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
