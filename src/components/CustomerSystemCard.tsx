"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SYSTEM_STATUS, SYSTEM_STATUS_OPTIONS, type SystemStatus } from "@/lib/system-status";

interface CustomerSystem {
  id: string;
  customer_id: string;
  system_code: string;
  system_name: string;
  version: string | null;
  bridge_version: string | null;
  production_url: string | null;
  github_repository: string | null;
  vercel_project_name: string | null;
  railway_project_name: string | null;
  supabase_project_name: string | null;
  system_status: SystemStatus;
  last_deployed_at: string | null;
  last_seen_at: string | null;
  notes: string | null;
  created_at: string;
}

function Field({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  if (!value) return (
    <div className="py-2.5 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
      <p className="text-[10px] font-semibold mb-0.5" style={{ color: "#9a9a9a" }}>{label}</p>
      <p className="text-xs" style={{ color: "#d0d0d0" }}>―</p>
    </div>
  );
  return (
    <div className="py-2.5 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
      <p className="text-[10px] font-semibold mb-0.5" style={{ color: "#9a9a9a" }}>{label}</p>
      {link ? (
        <a href={value.startsWith("http") ? value : `https://github.com/${value}`}
          target="_blank" rel="noopener noreferrer"
          className="text-xs font-mono" style={{ color: "#f97316" }}>{value}</a>
      ) : (
        <p className="text-xs font-mono" style={{ color: "#1a1a1a" }}>{value}</p>
      )}
    </div>
  );
}

function SystemEditModal({ sys, customerId, onClose }: { sys: CustomerSystem; customerId: string; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    system_name:           sys.system_name,
    version:               sys.version ?? "",
    bridge_version:        sys.bridge_version ?? "",
    production_url:        sys.production_url ?? "",
    github_repository:     sys.github_repository ?? "",
    vercel_project_name:   sys.vercel_project_name ?? "",
    railway_project_name:  sys.railway_project_name ?? "",
    supabase_project_name: sys.supabase_project_name ?? "",
    system_status:         sys.system_status,
    notes:                 sys.notes ?? "",
    last_deployed_at:      sys.last_deployed_at?.slice(0,10) ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/customers/${customerId}/systems/${sys.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    router.refresh();
    onClose();
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: 8, fontSize: 12, outline: "none",
    background: "#f8f7f4", border: "1.5px solid rgba(0,0,0,0.1)", color: "#1a1a1a",
  };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 600, marginBottom: 3, color: "#4a4a4a" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <p className="font-bold" style={{ color: "#1a1a1a" }}>{sys.system_code} を編集</p>
          <button onClick={onClose} style={{ color: "#9a9a9a", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div className="px-6 py-4 overflow-y-auto space-y-3" style={{ maxHeight: "70vh" }}>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={lbl}>System名</label><input value={form.system_name} onChange={set("system_name")} style={inp} /></div>
            <div>
              <label style={lbl}>ステータス</label>
              <select value={form.system_status} onChange={set("system_status")} style={inp}>
                {SYSTEM_STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{SYSTEM_STATUS[s].label}</option>
                ))}
              </select>
            </div>
            <div><label style={lbl}>バージョン</label><input value={form.version} onChange={set("version")} placeholder="1.0.0" style={inp} /></div>
            <div><label style={lbl}>Bridge Version</label><input value={form.bridge_version} onChange={set("bridge_version")} placeholder="3.1.0" style={inp} /></div>
          </div>

          <p className="text-[9px] font-bold tracking-widest uppercase pt-1" style={{ color: "#9a9a9a" }}>外部サービス（Project名・URLのみ / Secretは保存しない）</p>

          <div><label style={lbl}>本番URL</label><input value={form.production_url} onChange={set("production_url")} placeholder="https://..." style={inp} /></div>
          <div><label style={lbl}>GitHub Repository</label><input value={form.github_repository} onChange={set("github_repository")} placeholder="owner/repo" style={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={lbl}>Vercel Project名</label><input value={form.vercel_project_name} onChange={set("vercel_project_name")} style={inp} /></div>
            <div><label style={lbl}>Railway Project名</label><input value={form.railway_project_name} onChange={set("railway_project_name")} style={inp} /></div>
            <div><label style={lbl}>Supabase Project名</label><input value={form.supabase_project_name} onChange={set("supabase_project_name")} style={inp} /></div>
            <div><label style={lbl}>最終デプロイ日</label><input type="date" value={form.last_deployed_at} onChange={set("last_deployed_at")} style={inp} /></div>
          </div>
          <div><label style={lbl}>メモ</label><textarea value={form.notes} onChange={set("notes")} rows={2} style={{ ...inp, resize: "vertical" }} /></div>

          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff",
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "保存中..." : "保存"}
          </button>
          <button onClick={onClose} style={{ fontSize: 12, color: "#9a9a9a", cursor: "pointer" }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

export function CustomerSystemCard({ sys, customerId }: { sys: CustomerSystem; customerId: string }) {
  const [editing, setEditing] = useState(false);
  const cfg = SYSTEM_STATUS[sys.system_status] ?? SYSTEM_STATUS.BUILDING;

  return (
    <>
      {editing && <SystemEditModal sys={sys} customerId={customerId} onClose={() => setEditing(false)} />}

      <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2 py-1 rounded"
              style={{ background: "rgba(249,115,22,0.08)", color: "#ea580c" }}>
              {sys.system_code}
            </span>
            <p className="font-bold" style={{ color: "#1a1a1a" }}>{sys.system_name}</p>
            <span style={{ color: cfg.color, background: cfg.bg, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
              {cfg.label}
            </span>
          </div>
          <button onClick={() => setEditing(true)}
            style={{ fontSize: 11, fontWeight: 700, color: "#f97316", cursor: "pointer",
              padding: "4px 12px", borderRadius: 6, background: "rgba(249,115,22,0.08)" }}>
            編集
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <Field label="バージョン" value={sys.version} />
            <Field label="Bridge Version" value={sys.bridge_version} />
            <Field label="最終デプロイ" value={sys.last_deployed_at ? new Date(sys.last_deployed_at).toLocaleDateString("ja-JP") : null} />
            <Field label="本番URL" value={sys.production_url} link />
          </div>
          <div>
            <Field label="GitHub" value={sys.github_repository} link />
            <Field label="Vercel Project" value={sys.vercel_project_name} />
            <Field label="Railway Project" value={sys.railway_project_name} />
            <Field label="Supabase Project" value={sys.supabase_project_name} />
          </div>
        </div>

        {sys.notes && (
          <p className="mt-3 text-xs" style={{ color: "#4a4a4a" }}>{sys.notes}</p>
        )}
      </div>
    </>
  );
}

export function AddSystemForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    system_code: "", system_name: "", production_url: "",
    github_repository: "", vercel_project_name: "", railway_project_name: "",
    supabase_project_name: "", version: "", bridge_version: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAdd = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/customers/${customerId}/systems`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    router.refresh();
    setOpen(false);
    setForm({ system_code: "", system_name: "", production_url: "", github_repository: "",
      vercel_project_name: "", railway_project_name: "", supabase_project_name: "", version: "", bridge_version: "" });
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13, outline: "none",
    background: "#f8f7f4", border: "1.5px solid rgba(0,0,0,0.1)", color: "#1a1a1a",
  };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "#4a4a4a" };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      width: "100%", padding: "14px", borderRadius: 16, fontSize: 13, fontWeight: 700,
      border: "2px dashed rgba(249,115,22,0.3)", color: "#f97316", cursor: "pointer",
      background: "rgba(249,115,22,0.03)",
    }}>
      + Systemを追加
    </button>
  );

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "#fff", border: "2px solid rgba(249,115,22,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <p className="text-sm font-bold" style={{ color: "#1a1a1a" }}>新規System追加</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label style={lbl}>Systemコード <span style={{ color: "#dc2626" }}>*</span></label>
          <input value={form.system_code} onChange={set("system_code")} placeholder="SYS-001-01" style={inp} /></div>
        <div><label style={lbl}>System名 <span style={{ color: "#dc2626" }}>*</span></label>
          <input value={form.system_name} onChange={set("system_name")} placeholder="AVL-FX Trading View" style={inp} /></div>
        <div><label style={lbl}>本番URL</label>
          <input value={form.production_url} onChange={set("production_url")} placeholder="https://..." style={inp} /></div>
        <div><label style={lbl}>GitHub Repository</label>
          <input value={form.github_repository} onChange={set("github_repository")} placeholder="owner/repo" style={inp} /></div>
        <div><label style={lbl}>Vercel Project名</label>
          <input value={form.vercel_project_name} onChange={set("vercel_project_name")} style={inp} /></div>
        <div><label style={lbl}>Railway Project名</label>
          <input value={form.railway_project_name} onChange={set("railway_project_name")} style={inp} /></div>
        <div><label style={lbl}>Supabase Project名</label>
          <input value={form.supabase_project_name} onChange={set("supabase_project_name")} style={inp} /></div>
        <div><label style={lbl}>Bridge Version</label>
          <input value={form.bridge_version} onChange={set("bridge_version")} placeholder="3.0.0" style={inp} /></div>
      </div>
      {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
      <div className="flex gap-3">
        <button onClick={handleAdd} disabled={saving} style={{
          padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff",
          cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
        }}>{saving ? "追加中..." : "追加"}</button>
        <button onClick={() => setOpen(false)} style={{ fontSize: 12, color: "#9a9a9a", cursor: "pointer" }}>キャンセル</button>
      </div>
    </div>
  );
}
