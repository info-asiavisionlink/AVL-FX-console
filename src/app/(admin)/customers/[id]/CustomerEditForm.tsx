"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  initial: {
    customer_name: string;
    company_name: string;
    display_name: string;
    email: string;
    status: string;
    notes: string;
    development_started_at: string;
    delivered_at: string;
    maintenance_started_at: string;
    maintenance_ended_at: string;
  };
  statusOptions: string[];
  statusLabels: Record<string, string>;
}

export function CustomerEditForm({ id, initial, statusOptions, statusLabels }: Props) {
  const router = useRouter();
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg("エラー: " + (data.error ?? "失敗"));
    } else {
      setMsg("更新しました");
      setOpen(false);
      router.refresh();
    }
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13, outline: "none",
    background: "#f8f7f4", border: "1.5px solid rgba(0,0,0,0.1)", color: "#1a1a1a",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "#4a4a4a",
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ cursor: "pointer", background: "transparent" }}>
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>情報を編集</p>
        <span style={{ color: "#9a9a9a", fontSize: 12 }}>{open ? "▲ 閉じる" : "▼ 開く"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div>
              <label style={labelStyle}>担当者名</label>
              <input value={form.customer_name} onChange={set("customer_name")} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>会社名</label>
              <input value={form.company_name} onChange={set("company_name")} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>表示名</label>
              <input value={form.display_name} onChange={set("display_name")} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>メールアドレス</label>
              <input value={form.email} onChange={set("email")} type="email" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>ステータス</label>
            <select value={form.status} onChange={set("status")} style={inputStyle}>
              {statusOptions.map(s => (
                <option key={s} value={s}>{statusLabels[s] ?? s}</option>
              ))}
            </select>
          </div>

          <p className="text-[10px] font-bold tracking-widest uppercase pt-2" style={{ color: "#9a9a9a" }}>ライフサイクル日付</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "development_started_at", label: "開発開始日" },
              { key: "delivered_at",            label: "納品日" },
              { key: "maintenance_started_at",  label: "管理開始日" },
              { key: "maintenance_ended_at",    label: "管理終了日" },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input type="date" value={form[f.key as keyof typeof form]} onChange={set(f.key)} style={inputStyle} />
              </div>
            ))}
          </div>

          <div>
            <label style={labelStyle}>メモ</label>
            <textarea value={form.notes} onChange={set("notes")} rows={3}
              style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {msg && (
            <p className="text-xs" style={{ color: msg.startsWith("エラー") ? "#dc2626" : "#16a34a" }}>{msg}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} style={{
              padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff",
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "保存中..." : "保存"}
            </button>
            <button onClick={() => { setOpen(false); setForm(initial); setMsg(null); }}
              style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, color: "#9a9a9a", cursor: "pointer" }}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
