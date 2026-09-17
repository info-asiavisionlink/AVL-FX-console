import { getAdminSupabase } from "@/lib/admin-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CUSTOMER_STATUS, STATUS_OPTIONS, type CustomerStatus } from "@/lib/customer-status";
import { CustomerEditForm } from "./CustomerEditForm";
import { CustomerSystemCard, AddSystemForm } from "@/components/CustomerSystemCard";
import { ContractCard } from "@/components/ContractCard";
import { ResearchTokenCard } from "@/components/ResearchTokenCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCustomer(id: string) {
  const sb = await getAdminSupabase();
  const { data, error } = await sb.from("customers").select("*").eq("id", id).single();
  if (error || !data) return null;
  return data;
}

async function getContract(customerId: string) {
  const sb = await getAdminSupabase();
  const { data } = await sb
    .from("customer_contracts")
    .select("*")
    .eq("customer_id", customerId)
    .single();
  return data ?? null;
}

async function getTokens(customerId: string) {
  const sb = await getAdminSupabase();
  const { data } = await sb
    .from("system_tokens")
    .select("id, token_name, token, is_active, last_used_at, created_at, customer_system_id, notes")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

async function getSystems(customerId: string) {
  const sb = await getAdminSupabase();
  const { data } = await sb
    .from("customer_systems")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at");
  return data ?? [];
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, systems, contract, tokens] = await Promise.all([getCustomer(id), getSystems(id), getContract(id), getTokens(id)]);
  if (!customer) notFound();

  const cfg = CUSTOMER_STATUS[(customer.status as CustomerStatus)] ?? CUSTOMER_STATUS.LEAD;

  const fields = [
    { label: "顧客コード",    value: customer.customer_code },
    { label: "担当者名",      value: customer.customer_name },
    { label: "会社名",        value: customer.company_name ?? "―" },
    { label: "メールアドレス", value: customer.email },
    { label: "登録日",        value: new Date(customer.created_at).toLocaleDateString("ja-JP") },
  ];

  const dates = [
    { label: "開発開始",  value: customer.development_started_at },
    { label: "納品日",    value: customer.delivered_at },
    { label: "管理開始",  value: customer.maintenance_started_at },
    { label: "管理終了",  value: customer.maintenance_ended_at },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers" style={{ color: "#9a9a9a", fontSize: 13 }}>← 顧客一覧</Link>
          <span style={{ color: "#d0d0d0" }}>/</span>
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm font-mono px-2 py-1 rounded"
              style={{ background: "rgba(249,115,22,0.08)", color: "#ea580c" }}>
              {customer.customer_code}
            </span>
            <h2 className="text-xl font-black" style={{ color: "#1a1a1a" }}>{customer.display_name}</h2>
            <span style={{
              color: cfg.color, background: cfg.bg,
              padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
            }}>{cfg.label}</span>
          </div>
        </div>
        {/* クイックリンク */}
        <div className="flex gap-2">
          <Link href={`/customers/${id}/deployments`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ background: "rgba(249,115,22,0.08)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }}>
            🚀 デプロイ履歴
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 基本情報 */}
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <p className="text-[10px] font-bold tracking-widest uppercase mb-4" style={{ color: "#9a9a9a" }}>基本情報</p>
          <div className="space-y-3">
            {fields.map(f => (
              <div key={f.label} className="flex justify-between py-2 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                <span className="text-xs font-medium" style={{ color: "#9a9a9a" }}>{f.label}</span>
                <span className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ライフサイクル */}
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <p className="text-[10px] font-bold tracking-widest uppercase mb-4" style={{ color: "#9a9a9a" }}>ライフサイクル</p>
          <div className="space-y-3">
            {dates.map(d => (
              <div key={d.label} className="flex justify-between py-2 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                <span className="text-xs font-medium" style={{ color: "#9a9a9a" }}>{d.label}</span>
                <span className="text-sm" style={{ color: d.value ? "#1a1a1a" : "#d0d0d0" }}>
                  {d.value ? new Date(d.value).toLocaleDateString("ja-JP") : "―"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* メモ */}
      {customer.notes && (
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#9a9a9a" }}>メモ</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "#4a4a4a" }}>{customer.notes}</p>
        </div>
      )}

      {/* System Registry */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black" style={{ color: "#1a1a1a" }}>専用Systemセット</h3>
            <p className="text-xs mt-0.5" style={{ color: "#9a9a9a" }}>
              顧客に提供した独立Systemのメタデータ（Secretは保存しない）
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded"
            style={{ background: "rgba(0,0,0,0.05)", color: "#9a9a9a" }}>
            {systems.length} セット
          </span>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {systems.map((sys: any) => (
          <CustomerSystemCard key={sys.id} sys={sys} customerId={id} />
        ))}
        <AddSystemForm customerId={id} />
      </div>

      {/* 契約情報 */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-black" style={{ color: "#1a1a1a" }}>契約情報</h3>
          <p className="text-xs mt-0.5" style={{ color: "#9a9a9a" }}>
            開発費・月額管理費・Research Access・移管状態
          </p>
        </div>
        <ContractCard contract={contract} customerId={id} />
      </div>

      {/* Research API トークン */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-black" style={{ color: "#1a1a1a" }}>Research API アクセス</h3>
          <p className="text-xs mt-0.5" style={{ color: "#9a9a9a" }}>
            Trading View → Research API 認証トークン管理
          </p>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ResearchTokenCard tokens={tokens as any} customerId={id} />
      </div>

      {/* 編集フォーム */}
      <CustomerEditForm
        id={customer.id}
        initial={{
          customer_name:           customer.customer_name,
          company_name:            customer.company_name ?? "",
          display_name:            customer.display_name,
          email:                   customer.email,
          status:                  customer.status,
          notes:                   customer.notes ?? "",
          development_started_at:  customer.development_started_at?.slice(0,10) ?? "",
          delivered_at:            customer.delivered_at?.slice(0,10) ?? "",
          maintenance_started_at:  customer.maintenance_started_at?.slice(0,10) ?? "",
          maintenance_ended_at:    customer.maintenance_ended_at?.slice(0,10) ?? "",
        }}
        statusOptions={STATUS_OPTIONS}
        statusLabels={Object.fromEntries(Object.entries(CUSTOMER_STATUS).map(([k,v]) => [k, v.label]))}
      />
    </div>
  );
}
