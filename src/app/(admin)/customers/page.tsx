import { getAdminSupabase } from "@/lib/admin-auth";
import { CUSTOMER_STATUS, STATUS_OPTIONS, getSubscriptionStatus, type CustomerStatus } from "@/lib/customer-status";
import { SubscriptionStatusBadge } from "@/components/SubscriptionStatusBadge";
import Link from "next/link";

interface CustomerRow {
  id: string;
  customer_code: string;
  customer_name: string;
  company_name: string | null;
  display_name: string;
  email: string;
  status: CustomerStatus;
  created_at: string;
}

interface ContractRow {
  customer_id: string;
  research_access_enabled: boolean;
  transfer_status: string;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCustomers() {
  const sb = await getAdminSupabase();
  const { data } = await sb.from("customers").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

async function getContracts(): Promise<ContractRow[]> {
  const sb = await getAdminSupabase();
  const { data } = await sb
    .from("customer_contracts")
    .select("customer_id, research_access_enabled, transfer_status");
  return (data ?? []) as ContractRow[];
}

export default async function CustomersPage() {
  const [customers, contracts] = await Promise.all([getCustomers(), getContracts()]);

  void STATUS_OPTIONS;
  const contractMap = Object.fromEntries(contracts.map(c => [c.customer_id, c]));

  const byStatus = Object.fromEntries(
    Object.keys(CUSTOMER_STATUS).map(s => [
      s,
      (customers as CustomerRow[]).filter(c => c.status === s).length,
    ])
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "#1a1a1a" }}>顧客管理</h2>
          <p className="text-sm mt-1" style={{ color: "#9a9a9a" }}>
            カスタム開発顧客台帳 — {customers.length}社
          </p>
        </div>
        <Link href="/customers/new"
          style={{
            padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            color: "#fff", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
          }}>
          + 新規登録
        </Link>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-3 lg:grid-cols-8">
        {(Object.entries(CUSTOMER_STATUS) as [CustomerStatus, typeof CUSTOMER_STATUS[CustomerStatus]][]).map(([key, cfg]) => (
          <div key={key} className="rounded-xl p-3 text-center" style={{
            background: "#fff", border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <p className="text-2xl font-black" style={{ color: byStatus[key] ? cfg.color : "#d0d0d0" }}>
              {byStatus[key] ?? 0}
            </p>
            <p className="text-[9px] font-semibold mt-0.5" style={{ color: "#9a9a9a" }}>{cfg.label}</p>
          </div>
        ))}
      </div>

      {/* Customer list */}
      {customers.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
          <p className="text-lg font-bold mb-2" style={{ color: "#4a4a4a" }}>顧客がまだいません</p>
          <p className="text-sm mb-4" style={{ color: "#9a9a9a" }}>「新規登録」から最初の顧客を追加してください</p>
          <Link href="/customers/new"
            style={{ padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: "rgba(249,115,22,0.1)", color: "#ea580c", border: "1px solid rgba(249,115,22,0.25)" }}>
            + 新規登録
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{
          background: "#fff", border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#f8f7f4" }}>
                {["顧客コード", "表示名", "メール", "ステータス", "月額ステータス", "登録日", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold tracking-wide uppercase"
                    style={{ color: "#9a9a9a" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(customers as CustomerRow[]).map(c => {
                const cfg      = CUSTOMER_STATUS[c.status] ?? CUSTOMER_STATUS.LEAD;
                const contract = contractMap[c.id] ?? null;
                const subStatus = getSubscriptionStatus(contract);
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                    className="hover:bg-orange-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="font-bold text-xs font-mono px-2 py-1 rounded"
                        style={{ background: "rgba(249,115,22,0.08)", color: "#ea580c" }}>
                        {c.customer_code}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{c.display_name}</p>
                      {c.company_name && (
                        <p className="text-xs mt-0.5" style={{ color: "#9a9a9a" }}>{c.company_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm" style={{ color: "#4a4a4a" }}>{c.email}</td>
                    <td className="px-4 py-4">
                      <span style={{
                        color: cfg.color, background: cfg.bg,
                        padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                      }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <SubscriptionStatusBadge
                        customerId={c.id}
                        contract={contract}
                        compact
                      />
                    </td>
                    <td className="px-4 py-4 text-xs" style={{ color: "#9a9a9a" }}>
                      {new Date(c.created_at).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/customers/${c.id}`} className="text-xs font-semibold"
                        style={{ color: "#f97316" }}>
                        詳細 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
