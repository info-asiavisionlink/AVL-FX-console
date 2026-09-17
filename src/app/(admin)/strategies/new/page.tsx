"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TF_OPTIONS = ["M1","M5","M15","M30","H1","H4","D1","W1"];

export default function NewStrategyPage() {
  const router = useRouter();
  const [f, setF] = useState({
    name:               "",
    description:        "",
    canonical_symbol:   "GOLD",
    timeframes:         ["H1"] as string[],
    visibility:         "PRIVATE",
    status:             "DRAFT",
    spec:               "{}",
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

    const res = await fetch("/api/strategies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, spec }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    router.push(`/strategies/${data.id}`);
  };

  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13, outline: "none", background: "#f8f7f4", border: "1.5px solid rgba(0,0,0,0.1)", color: "#1a1a1a" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "#4a4a4a" };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/strategies" style={{ color: "#9a9a9a", fontSize: 13 }}>← Strategy一覧</Link>
        <span style={{ color: "#d0d0d0" }}>/</span>
        <h2 className="text-xl font-black" style={{ color: "#1a1a1a" }}>新規 Strategy 作成</h2>
      </div>

      <div className="rounded-2xl p-6 space-y-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>

        {/* 基本情報 */}
        <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>基本情報</p>
        <div>
          <label style={lbl}>Strategy名 <span style={{ color: "#dc2626" }}>*</span></label>
          <input value={f.name} onChange={set("name")} style={inp} placeholder="例: GOLD H1 Breakout Strategy" />
        </div>
        <div>
          <label style={lbl}>説明</label>
          <textarea value={f.description} onChange={set("description")} rows={2} style={{ ...inp, resize: "vertical" }} placeholder="エントリー・エグジット条件の概要" />
        </div>

        {/* Symbol / TF */}
        <p className="text-[9px] font-bold tracking-widest uppercase pt-1" style={{ color: "#9a9a9a" }}>Symbol / Timeframe</p>
        <div>
          <label style={lbl}>Canonical Symbol</label>
          <input value={f.canonical_symbol} readOnly style={{ ...inp, background: "rgba(0,0,0,0.03)", color: "#9a9a9a" }} />
          <p className="text-xs mt-1" style={{ color: "#9a9a9a" }}>現在はGOLD専用です</p>
        </div>
        <div>
          <label style={lbl}>Timeframes（複数選択可）</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {TF_OPTIONS.map(tf => (
              <button key={tf} type="button" onClick={() => toggleTF(tf)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
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

        {/* 設定 */}
        <p className="text-[9px] font-bold tracking-widest uppercase pt-1" style={{ color: "#9a9a9a" }}>公開設定</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={lbl}>公開範囲</label>
            <select value={f.visibility} onChange={set("visibility")} style={inp}>
              <option value="PRIVATE">非公開（作成者のみ）</option>
              <option value="UNLISTED">限定公開（IDを知る人のみ）</option>
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

        {/* Spec JSON */}
        <p className="text-[9px] font-bold tracking-widest uppercase pt-1" style={{ color: "#9a9a9a" }}>Strategy Spec（JSON）</p>
        <div>
          <label style={lbl}>spec</label>
          <textarea
            value={f.spec}
            onChange={set("spec")}
            rows={8}
            style={{ ...inp, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
            placeholder={'{\n  "entry_conditions": [],\n  "exit_conditions": [],\n  "filters": [],\n  "risk": {}\n}'}
          />
          <p className="text-xs mt-1" style={{ color: "#9a9a9a" }}>有効な JSON を入力してください。後から編集できます。</p>
        </div>

        {error && <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving || !f.name.trim()}
            style={{
              padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff",
              cursor: (saving || !f.name.trim()) ? "not-allowed" : "pointer",
              opacity: (saving || !f.name.trim()) ? 0.6 : 1,
            }}>
            {saving ? "作成中..." : "Strategy を作成"}
          </button>
          <Link href="/strategies" style={{ fontSize: 13, color: "#9a9a9a", display: "flex", alignItems: "center" }}>
            キャンセル
          </Link>
        </div>
      </div>
    </div>
  );
}
