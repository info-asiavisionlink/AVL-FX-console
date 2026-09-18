import { getAdminSupabase } from "@/lib/admin-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getStats() {
  const sb = await getAdminSupabase();

  const [
    { count: customerCount },
    { count: systemCount },
    { count: tokenCount },
    { count: strategyCount },
    { count: barCount },
    { data: auditLogs },
    { data: recentDenials },
  ] = await Promise.all([
    sb.from("customers").select("*", { count: "exact", head: true }),
    sb.from("customer_systems").select("*", { count: "exact", head: true }),
    sb.from("system_tokens").select("*", { count: "exact", head: true }).eq("is_active", true),
    sb.from("strategy_registry").select("*", { count: "exact", head: true }),
    sb.from("bar_data").select("*", { count: "exact", head: true }),
    sb.from("console_audit_log").select("admin_email, action, summary, created_at").order("created_at", { ascending: false }).limit(20),
    sb.from("research_access_log").select("customer_id, endpoint, denial_reason, created_at").eq("status", "DENIED").order("created_at", { ascending: false }).limit(5),
  ]);

  return { customerCount, systemCount, tokenCount, strategyCount, barCount, auditLogs: auditLogs ?? [], recentDenials: recentDenials ?? [] };
}

function Card({ title, value, sub, color = "#f97316" }: { title: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <p className="text-xs font-semibold mb-1" style={{ color: "#9a9a9a" }}>{title}</p>
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "#9a9a9a" }}>{sub}</p>}
    </div>
  );
}

export default async function SettingsPage() {
  const { customerCount, systemCount, tokenCount, strategyCount, barCount, auditLogs, recentDenials } = await getStats();

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim()).filter(Boolean);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black" style={{ color: "#1a1a1a" }}>Console 設定 / 運用管理</h2>
        <p className="text-sm mt-1" style={{ color: "#9a9a9a" }}>システム状態・管理者設定・操作ログ</p>
      </div>

      {/* System Stats */}
      <section className="space-y-3">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>リソース概要</p>
        <div className="grid grid-cols-5 gap-3">
          <Card title="顧客数"          value={customerCount ?? 0} />
          <Card title="Systemセット"    value={systemCount ?? 0} />
          <Card title="有効 Token"      value={tokenCount ?? 0}   color="#7c3aed" />
          <Card title="Strategy"        value={strategyCount ?? 0} color="#2563eb" />
          <Card title="Bar Data"        value={barCount ? `${(barCount/10000).toFixed(0)}万本` : "―"} color="#16a34a" />
        </div>
      </section>

      {/* Admin Config */}
      <section className="space-y-3">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>管理者設定</p>
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-bold" style={{ color: "#1a1a1a" }}>ADMIN_EMAILS</p>
              <p className="text-xs mt-0.5" style={{ color: "#9a9a9a" }}>Vercel 環境変数で管理。変更は Vercel Dashboard → Settings → Environment Variables。</p>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: "rgba(22,163,74,0.08)", color: "#16a34a" }}>
              {adminEmails.length} 名
            </span>
          </div>
          <div className="space-y-1.5">
            {adminEmails.map(email => (
              <div key={email} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(0,0,0,0.02)" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: "#16a34a" }} />
                <span className="text-sm font-mono" style={{ color: "#1a1a1a" }}>{email}</span>
              </div>
            ))}
            {adminEmails.length === 0 && (
              <p className="text-xs" style={{ color: "#dc2626" }}>⚠ ADMIN_EMAILS が設定されていません。全ログインユーザーがアクセス可能な状態です。</p>
            )}
          </div>
        </div>
      </section>

      {/* Infrastructure Links */}
      <section className="space-y-3">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>インフラリンク</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Vercel Dashboard",    url: "https://vercel.com/asia-link-ais-projects-ff6dd464/avl-fx-console", icon: "▲" },
            { label: "Supabase Console DB", url: "https://supabase.com/dashboard/project/ghufhqodgrkftmhjozhj", icon: "⚡" },
            { label: "Railway Gateway",     url: "https://railway.app/dashboard", icon: "🚂" },
            { label: "GitHub Repository",   url: "https://github.com/info-asiavisionlink/AVL-FX-console", icon: "🐙" },
          ].map(link => (
            <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-orange-50"
              style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <span className="text-lg">{link.icon}</span>
              <span className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>{link.label}</span>
              <span className="ml-auto text-xs" style={{ color: "#9a9a9a" }}>→</span>
            </a>
          ))}
        </div>
      </section>

      {/* Research Access Denials */}
      {recentDenials.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>
            Research API 拒否ログ（直近）
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(220,38,38,0.15)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(220,38,38,0.03)" }}>
                  {["日時", "エンドポイント", "理由"].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-bold" style={{ color: "#9a9a9a" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentDenials.map((d, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <td className="px-4 py-2" style={{ color: "#9a9a9a" }}>{new Date(d.created_at).toLocaleString("ja-JP")}</td>
                    <td className="px-4 py-2 font-mono" style={{ color: "#4a4a4a" }}>{d.endpoint}</td>
                    <td className="px-4 py-2" style={{ color: "#dc2626" }}>{d.denial_reason ?? "―"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Audit Log */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>Console 操作ログ</p>
          <span className="text-xs" style={{ color: "#9a9a9a" }}>直近 20 件</span>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          {auditLogs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs" style={{ color: "#9a9a9a" }}>操作ログがまだありません</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.02)" }}>
                  {["日時", "管理者", "アクション", "内容"].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-bold" style={{ color: "#9a9a9a" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: "#9a9a9a" }}>
                      {new Date(log.created_at).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: "#4a4a4a" }}>
                      {log.admin_email.split("@")[0]}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: "rgba(249,115,22,0.08)", color: "#ea580c" }}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "#4a4a4a" }}>{log.summary ?? "―"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* CI/CD Status */}
      <section className="space-y-3">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>CI/CD</p>
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold mb-1" style={{ color: "#1a1a1a" }}>GitHub Actions → Vercel 自動デプロイ</p>
              <p className="text-xs" style={{ color: "#9a9a9a" }}>main ブランチへの push で本番自動デプロイ / PR で Preview URL を発行</p>
              <div className="mt-3 space-y-1.5 text-xs" style={{ color: "#4a4a4a" }}>
                <p>必要な GitHub Secrets:</p>
                <code className="block px-2 py-1 rounded text-[11px]" style={{ background: "rgba(0,0,0,0.04)" }}>VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID</code>
              </div>
            </div>
            <a href="https://github.com/info-asiavisionlink/AVL-FX-console/settings/secrets/actions"
              target="_blank" rel="noopener noreferrer"
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: "rgba(249,115,22,0.08)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }}>
              Secrets 設定 →
            </a>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <div className="flex gap-3 flex-wrap">
        {[
          { href: "/customers",  label: "顧客管理" },
          { href: "/monitoring", label: "Monitoring" },
          { href: "/strategies", label: "Strategies" },
        ].map(l => (
          <Link key={l.href} href={l.href}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(0,0,0,0.04)", color: "#4a4a4a" }}>
            {l.label} →
          </Link>
        ))}
      </div>
    </div>
  );
}
