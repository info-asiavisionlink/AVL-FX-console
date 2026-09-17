"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STATUS_OPTIONS, CUSTOMER_STATUS } from "@/lib/customer-status";

export default function NewCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    customer_code: "",
    customer_name: "",
    company_name: "",
    display_name: "",
    email: "",
    status: "LEAD",
    notes: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "エラーが発生しました");
      setSaving(false);
      return;
    }

    router.push(`/customers/${data.id}`);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none",
    background: "#f8f7f4", border: "1.5px solid rgba(0,0,0,0.1)", color: "#1a1a1a",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#4a4a4a",
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/customers" style={{ color: "#9a9a9a", fontSize: 13 }}>← 顧客一覧</Link>
        <span style={{ color: "#d0d0d0" }}>/</span>
        <h2 className="text-xl font-black" style={{ color: "#1a1a1a" }}>新規顧客登録</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rounded-2xl p-6 space-y-5" style={{
          background: "#fff", border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>

          {/* 基本情報 */}
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>基本情報</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>顧客コード <span style={{ color: "#dc2626" }}>*</span></label>
              <input value={form.customer_code} onChange={set("customer_code")}
                placeholder="AVL-002" required style={inputStyle} />
              <p className="text-[10px] mt-1" style={{ color: "#9a9a9a" }}>例: AVL-001, AVL-002（自動採番しません）</p>
            </div>
            <div>
              <label style={labelStyle}>ステータス</label>
              <select value={form.status} onChange={set("status")} style={inputStyle}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{CUSTOMER_STATUS[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>担当者名 / 顧客名 <span style={{ color: "#dc2626" }}>*</span></label>
            <input value={form.customer_name} onChange={set("customer_name")}
              placeholder="田中 太郎" required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>会社名</label>
            <input value={form.company_name} onChange={set("company_name")}
              placeholder="株式会社〇〇（個人の場合は空欄）" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>表示名 <span style={{ color: "#dc2626" }}>*</span></label>
            <input value={form.display_name} onChange={set("display_name")}
              placeholder="〇〇社 / 田中様（Console上の呼称）" required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>メールアドレス <span style={{ color: "#dc2626" }}>*</span></label>
            <input value={form.email} onChange={set("email")} type="email"
              placeholder="customer@example.com" required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>メモ</label>
            <textarea value={form.notes} onChange={set("notes")}
              placeholder="商談内容・特記事項など" rows={3}
              style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
              <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} style={{
              padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "登録中..." : "登録する"}
            </button>
            <Link href="/customers" style={{ fontSize: 13, color: "#9a9a9a" }}>キャンセル</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
