"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Contract {
  id: string;
  customer_id: string;
  // 開発・納品
  development_fee: number | null;
  development_payment_status: string;
  development_paid_at: string | null;
  development_invoice_ref: string | null;
  // 月額管理
  management_fee: number | null;
  management_status: string;
  management_started_at: string | null;
  management_ended_at: string | null;
  management_billing_day: number | null;
  // Research Access
  research_access_enabled: boolean;
  research_fee: number | null;
  research_access_started_at: string | null;
  research_access_expires_at: string | null;
  research_access_notes: string | null;
  // 移管
  transfer_status: string;
  transfer_fee: number | null;
  transferred_at: string | null;
  transfer_notes: string | null;
  notes: string | null;
}

const DEV_PAY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "未払い",   color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
  PARTIAL:   { label: "一部入金", color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  PAID:      { label: "入金済み", color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  CANCELLED: { label: "キャンセル", color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
};

const MGMT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  INACTIVE:  { label: "未開始", color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
  ACTIVE:    { label: "契約中", color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  SUSPENDED: { label: "停止中", color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
  ENDED:     { label: "終了",   color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
};

const TRANSFER_STATUS: Record<string, { label: string; color: string }> = {
  NOT_REQUESTED: { label: "なし",      color: "#9a9a9a" },
  REQUESTED:     { label: "申請中",    color: "#d97706" },
  IN_PROGRESS:   { label: "移管作業中", color: "#2563eb" },
  COMPLETED:     { label: "移管完了",  color: "#9a9a9a" },
};

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ color, background: bg, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
      {label}
    </span>
  );
}

function ResearchStatus({ enabled, expires }: { enabled: boolean; expires: string | null }) {
  if (!enabled) return <Badge label="無効" color="#9a9a9a" bg="rgba(0,0,0,0.05)" />;
  if (!expires) return <Badge label="有効（無期限）" color="#16a34a" bg="rgba(22,163,74,0.08)" />;
  const expDate = new Date(expires);
  const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 0) return <Badge label="期限切れ" color="#dc2626" bg="rgba(220,38,38,0.08)" />;
  if (daysLeft < 30) return <Badge label={`残り${daysLeft}日`} color="#d97706" bg="rgba(217,119,6,0.08)" />;
  return <Badge label={`有効（${expDate.toLocaleDateString("ja-JP")}まで）`} color="#16a34a" bg="rgba(22,163,74,0.08)" />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-3" style={{
      background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    }}>
      <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>{title}</p>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
      <span className="text-xs font-medium" style={{ color: "#9a9a9a" }}>{label}</span>
      <div className="text-sm font-semibold text-right" style={{ color: "#1a1a1a" }}>{children}</div>
    </div>
  );
}

function fmt(n: number | null) {
  return n != null ? `¥${n.toLocaleString()}` : "―";
}
function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("ja-JP") : "―";
}

// ====================== Edit Modal ======================
function ContractEditModal({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    development_fee:            String(contract.development_fee ?? ""),
    development_payment_status: contract.development_payment_status,
    development_paid_at:        contract.development_paid_at?.slice(0,10) ?? "",
    development_invoice_ref:    contract.development_invoice_ref ?? "",
    management_fee:             String(contract.management_fee ?? ""),
    management_status:          contract.management_status,
    management_started_at:      contract.management_started_at?.slice(0,10) ?? "",
    management_ended_at:        contract.management_ended_at?.slice(0,10) ?? "",
    management_billing_day:     String(contract.management_billing_day ?? ""),
    research_access_enabled:    contract.research_access_enabled,
    research_fee:               String(contract.research_fee ?? ""),
    research_access_started_at: contract.research_access_started_at?.slice(0,10) ?? "",
    research_access_expires_at: contract.research_access_expires_at?.slice(0,10) ?? "",
    research_access_notes:      contract.research_access_notes ?? "",
    transfer_status:            contract.transfer_status,
    notes:                      contract.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));
  const setB = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.checked }));

  const handleSave = async () => {
    setSaving(true); setError(null);
    const payload = {
      ...f,
      development_fee:        f.development_fee ? Number(f.development_fee) : null,
      management_fee:         f.management_fee ? Number(f.management_fee) : null,
      research_fee:           f.research_fee ? Number(f.research_fee) : null,
      management_billing_day: f.management_billing_day ? Number(f.management_billing_day) : null,
    };
    const res = await fetch(`/api/customers/${contract.customer_id}/contract`, {
      method: "PUT",
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
      <div className="w-full max-w-xl rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <p className="font-bold" style={{ color: "#1a1a1a" }}>契約情報を編集</p>
          <button onClick={onClose} style={{ color: "#9a9a9a", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div className="px-6 py-4 overflow-y-auto space-y-4" style={{ maxHeight: "72vh" }}>

          {/* 開発費 */}
          <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>① 開発・納品</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={lbl}>開発費（円）</label><input type="number" value={f.development_fee} onChange={set("development_fee")} style={inp} placeholder="0" /></div>
            <div>
              <label style={lbl}>支払い状態</label>
              <select value={f.development_payment_status} onChange={set("development_payment_status")} style={inp}>
                {Object.entries(DEV_PAY_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div><label style={lbl}>入金日</label><input type="date" value={f.development_paid_at} onChange={set("development_paid_at")} style={inp} /></div>
            <div><label style={lbl}>請求書番号</label><input value={f.development_invoice_ref} onChange={set("development_invoice_ref")} style={inp} /></div>
          </div>

          {/* 月額管理 */}
          <p className="text-[9px] font-bold tracking-widest uppercase pt-1" style={{ color: "#9a9a9a" }}>② 月額システム管理</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={lbl}>月額管理費（円）</label><input type="number" value={f.management_fee} onChange={set("management_fee")} style={inp} placeholder="0" /></div>
            <div>
              <label style={lbl}>契約状態</label>
              <select value={f.management_status} onChange={set("management_status")} style={inp}>
                {Object.entries(MGMT_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div><label style={lbl}>管理開始日</label><input type="date" value={f.management_started_at} onChange={set("management_started_at")} style={inp} /></div>
            <div><label style={lbl}>管理終了日</label><input type="date" value={f.management_ended_at} onChange={set("management_ended_at")} style={inp} /></div>
            <div><label style={lbl}>請求日（毎月何日）</label><input type="number" min="1" max="28" value={f.management_billing_day} onChange={set("management_billing_day")} style={inp} placeholder="1〜28" /></div>
          </div>

          {/* Research Access */}
          <p className="text-[9px] font-bold tracking-widest uppercase pt-1" style={{ color: "#9a9a9a" }}>③ Research Access</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={f.research_access_enabled} onChange={setB("research_access_enabled")} />
            <span className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>Research Access 有効</span>
          </label>
          {f.research_access_enabled && (
            <div className="grid grid-cols-2 gap-3">
              <div><label style={lbl}>Research月額（円）</label><input type="number" value={f.research_fee} onChange={set("research_fee")} style={inp} placeholder="0" /></div>
              <div></div>
              <div><label style={lbl}>開始日</label><input type="date" value={f.research_access_started_at} onChange={set("research_access_started_at")} style={inp} /></div>
              <div><label style={lbl}>期限（空欄=無期限）</label><input type="date" value={f.research_access_expires_at} onChange={set("research_access_expires_at")} style={inp} /></div>
              <div className="col-span-2"><label style={lbl}>メモ</label><input value={f.research_access_notes} onChange={set("research_access_notes")} style={inp} /></div>
            </div>
          )}

          {/* 移管 */}
          <p className="text-[9px] font-bold tracking-widest uppercase pt-1" style={{ color: "#9a9a9a" }}>④ 移管</p>
          <div>
            <label style={lbl}>移管状態</label>
            <select value={f.transfer_status} onChange={set("transfer_status")} style={inp}>
              {Object.entries(TRANSFER_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* 全体メモ */}
          <div><label style={lbl}>メモ</label><textarea value={f.notes} onChange={set("notes")} rows={2} style={{ ...inp, resize: "vertical" }} /></div>

          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "保存中..." : "保存"}
          </button>
          <button onClick={onClose} style={{ fontSize: 12, color: "#9a9a9a", cursor: "pointer" }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// ====================== Main Component ======================
export function ContractCard({ contract: initial, customerId }: { contract: Contract | null; customerId: string }) {
  const router = useRouter();
  const [contract, setContract] = useState(initial);
  const [editing, setEditing]   = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    const res = await fetch(`/api/customers/${customerId}/contract`, { method: "POST" });
    const data = await res.json();
    if (res.ok) { setContract(data); router.refresh(); }
    setCreating(false);
  };

  if (!contract) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "#fff", border: "2px dashed rgba(249,115,22,0.25)" }}>
        <p className="text-sm font-semibold mb-2" style={{ color: "#4a4a4a" }}>契約情報がまだありません</p>
        <p className="text-xs mb-4" style={{ color: "#9a9a9a" }}>契約情報を作成して開発費・月額管理・Research Accessを管理します</p>
        <button onClick={handleCreate} disabled={creating} style={{
          padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: "rgba(249,115,22,0.1)", color: "#ea580c", border: "1px solid rgba(249,115,22,0.25)",
          cursor: creating ? "not-allowed" : "pointer",
        }}>
          {creating ? "作成中..." : "契約情報を作成"}
        </button>
      </div>
    );
  }

  const devCfg  = DEV_PAY_STATUS[contract.development_payment_status]  ?? DEV_PAY_STATUS.PENDING;
  const mgmtCfg = MGMT_STATUS[contract.management_status]              ?? MGMT_STATUS.INACTIVE;
  const xferCfg = TRANSFER_STATUS[contract.transfer_status]            ?? TRANSFER_STATUS.NOT_REQUESTED;

  return (
    <>
      {editing && <ContractEditModal contract={contract} onClose={() => { setEditing(false); router.refresh(); }} />}

      <div className="space-y-4">
        {/* 編集ボタン */}
        <div className="flex justify-end">
          <button onClick={() => setEditing(true)} style={{
            padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: "rgba(249,115,22,0.08)", color: "#f97316",
            border: "1px solid rgba(249,115,22,0.2)", cursor: "pointer",
          }}>
            契約情報を編集
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* 開発費 */}
          <Section title="① 開発・納品">
            <Row label="開発費">
              <Badge label={devCfg.label} color={devCfg.color} bg={devCfg.bg} />
            </Row>
            <Row label="金額">{fmt(contract.development_fee)}</Row>
            <Row label="入金日">{fmtDate(contract.development_paid_at)}</Row>
            {contract.development_invoice_ref && (
              <Row label="請求書番号"><span className="text-xs">{contract.development_invoice_ref}</span></Row>
            )}
          </Section>

          {/* 月額管理 */}
          <Section title="② 月額管理">
            <Row label="状態">
              <Badge label={mgmtCfg.label} color={mgmtCfg.color} bg={mgmtCfg.bg} />
            </Row>
            <Row label="月額">{fmt(contract.management_fee)}</Row>
            <Row label="開始日">{fmtDate(contract.management_started_at)}</Row>
            <Row label="終了日">{fmtDate(contract.management_ended_at)}</Row>
            {contract.management_billing_day && (
              <Row label="請求日">毎月 {contract.management_billing_day} 日</Row>
            )}
          </Section>

          {/* Research Access */}
          <Section title="③ Research Access">
            <Row label="状態">
              <ResearchStatus enabled={contract.research_access_enabled} expires={contract.research_access_expires_at} />
            </Row>
            {contract.research_access_enabled && <>
              <Row label="月額">{fmt(contract.research_fee)}</Row>
              <Row label="開始日">{fmtDate(contract.research_access_started_at)}</Row>
              <Row label="期限">{fmtDate(contract.research_access_expires_at)}</Row>
            </>}
            <Row label="移管状態">
              <span className="text-xs font-semibold" style={{ color: xferCfg.color }}>{xferCfg.label}</span>
            </Row>
            {contract.notes && (
              <p className="text-xs mt-2 pt-2 border-t" style={{ borderColor: "rgba(0,0,0,0.05)", color: "#4a4a4a" }}>
                {contract.notes}
              </p>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
