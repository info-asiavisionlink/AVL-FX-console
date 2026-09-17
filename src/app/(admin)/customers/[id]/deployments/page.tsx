import { getAdminSupabase } from "@/lib/admin-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeploymentsClient } from "./DeploymentsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface DeployRow {
  id: string;
  customer_system_id: string | null;
  system_code: string | null;
  deploy_type: string;
  version: string | null;
  bridge_version: string | null;
  vercel_url: string | null;
  status: string;
  notes: string | null;
  deployed_by: string | null;
  deployed_at: string;
}

interface SystemOption {
  id: string;
  system_code: string;
  system_name: string;
}

async function getData(customerId: string) {
  const sb = await getAdminSupabase();

  const [custRes, deploysRes, systemsRes] = await Promise.all([
    sb.from("customers").select("id, customer_code, display_name").eq("id", customerId).single(),
    sb.from("deployments").select("*").eq("customer_id", customerId).order("deployed_at", { ascending: false }),
    sb.from("customer_systems").select("id, system_code, system_name").eq("customer_id", customerId).order("created_at"),
  ]);

  return {
    customer: custRes.data,
    deployments: (deploysRes.data ?? []) as DeployRow[],
    systems: (systemsRes.data ?? []) as SystemOption[],
  };
}

export default async function DeploymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customer, deployments, systems } = await getData(id);
  if (!customer) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/customers/${id}`} style={{ color: "#9a9a9a", fontSize: 13 }}>← 顧客詳細</Link>
          <span style={{ color: "#d0d0d0" }}>/</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs font-mono px-2 py-1 rounded"
              style={{ background: "rgba(249,115,22,0.08)", color: "#ea580c" }}>
              {customer.customer_code}
            </span>
            <h2 className="text-xl font-black" style={{ color: "#1a1a1a" }}>デプロイ履歴</h2>
          </div>
        </div>
      </div>

      <DeploymentsClient deployments={deployments} systems={systems} customerId={id} />
    </div>
  );
}
