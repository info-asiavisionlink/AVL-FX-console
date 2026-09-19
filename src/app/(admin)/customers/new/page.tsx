"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STATUS_OPTIONS, CUSTOMER_STATUS } from "@/lib/customer-status";

const DEFAULT_DEV_FEE      = 300_000;
const DEFAULT_MONTHLY_FEE  = 30_000;
const DEFAULT_TRANSFER_FEE = 500_000;

export default function NewCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const [form, setForm] = useState({
    customer_code: "",
    customer_name: "",
    company_name:  "",
    display_name:  "",
    email:         "",
    status:        "LEAD",
    notes:         "",
    // 費用
    development_fee:  String(DEFAULT_DEV_FEE),
    management_fee:   String(DEFAULT_MONTHLY_FEE),
    transfer_fee:     String(DEFAULT_TRANSFER_FEE),
  });

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // 1. 顧客作成
    const res = await fetch("/api/customers", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        customer_code: form.customer_code,
        customer_name: form.customer_name,
        company_name:  form.company_name,
        display_name:  form.display_name,
        email:         form.email,
        status:        form.status,
        notes:         form.notes,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "エラーが発生しました");
      setSaving(false);
      return;
    }

    // 2. 契約情報を自動作成（費用をセット）
    await fetch(`/api/customers/${data.id}/contract`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
    });
    // 費用を更新
    await fetch(`/api/customers/${data.id}/contract`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        development_fee: form.development_fee ? Number(form.development_fee) : null,
        management_fee:  form.management_fee  ? Number(form.management_fee)  : null,
        transfer_fee:    form.transfer_fee    ? Number(form.transfer_fee)    : null,
      }),
    });

    router.push(`/customers/${data.id}`);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none",
    background: "#f8f7f4", border: "1.5px solid rgba(0,0,0,0.1)", color: "#1a1a1a",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#4a4a4a",
  };
  const sectionStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)", borderRadius: 16, padding: "24px",
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/customers" style={{ color: "#9a9a9a", fontSize: 13 }}>← 顧客一覧</Link>
        <span style={{ color: "#d0d0d0" }}>/</span>
        <h2 className="text-xl font-black" style={{ color: "#1a1a1a" }}>新規顧客登録</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* 基本情報 */}
        <div style={sectionStyle} className="space-y-5">
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>基本情報</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>顧客コード <span style={{ color: "#dc2626" }}>*</span></label>
              <input value={form.customer_code} onChange={set("customer_code")}
                placeholder="AVL-003" required style={inputStyle} />
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
        </div>

        {/* 費用情報 */}
        <div style={sectionStyle} className="space-y-5">
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>費用情報</p>
          <p className="text-xs" style={{ color: "#9a9a9a" }}>登録時に契約情報へ自動反映されます。後から変更可能です。</p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label style={labelStyle}>新規開発費用（円）</label>
              <input
                type="number"
                value={form.development_fee}
                onChange={set("development_fee")}
                style={inputStyle}
                placeholder="300000"
              />
              <p className="text-[10px] mt-1" style={{ color: "#9a9a9a" }}>口座紐付け・システム構築</p>
            </div>
            <div>
              <label style={labelStyle}>月額使用料（円）</label>
              <div style={{ ...inputStyle, color: "#9a9a9a", cursor: "not-allowed", display: "flex", alignItems: "center" }}>
                ¥{Number(DEFAULT_MONTHLY_FEE).toLocaleString()}
              </div>
              <p className="text-[10px] mt-1" style={{ color: "#9a9a9a" }}>固定（サーバー使用料）</p>
            </div>
            <div>
              <label style={labelStyle}>移管費用（円）</label>
              <input
                type="number"
                value={form.transfer_fee}
                onChange={set("transfer_fee")}
                style={inputStyle}
                placeholder="500000"
              />
              <p className="text-[10px] mt-1" style={{ color: "#9a9a9a" }}>Railway/Vercel/Supabase 移管</p>
            </div>
          </div>

          {/* 料金まとめ */}
          <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.15)" }}>
            <p className="text-[9px] font-bold tracking-widest" style={{ color: "#f97316" }}>料金サマリー</p>
            {[
              { label: "新規開発費用（一括）", value: Number(form.development_fee) || 0 },
              { label: "月額使用料",           value: DEFAULT_MONTHLY_FEE },
              { label: "移管費用（オプション）", value: Number(form.transfer_fee) || 0 },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span style={{ color: "#4a4a4a" }}>{label}</span>
                <span className="font-bold" style={{ color: "#1a1a1a" }}>¥{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
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
      </form>
    </div>
  );
}
