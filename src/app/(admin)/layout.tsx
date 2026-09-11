import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/dashboard",    label: "ダッシュボード",     icon: "📊" },
  { href: "/market-data",  label: "市場データ",          icon: "📡" },
  { href: "/historical",   label: "ヒストリカルデータ",   icon: "📁" },
  { href: "/mt5",          label: "MT5接続",             icon: "🖥️" },
  { href: "/gateway",      label: "ゲートウェイ",         icon: "🔀" },
  { href: "/system",       label: "システム診断",         icon: "🔍" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await requireAdmin();
  if (!ok) redirect("/login?error=unauthorized");

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col" style={{
        background: "#ffffff",
        borderRight: "1px solid var(--border)",
        boxShadow: "1px 0 0 rgba(0,0,0,0.04)",
      }}>
        {/* Brand */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>A</div>
            <div>
              <p className="text-[9px] tracking-[0.25em] font-semibold" style={{ color: "var(--text-muted)" }}>AVLFX</p>
              <h1 className="text-[13px] font-black tracking-wider" style={{ color: "var(--text-primary)" }}>CONSOLE</h1>
            </div>
          </div>
          <p className="text-[9px] mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            管理者専用コントロールパネル
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={undefined}
            >
              <span className="w-5 text-center text-base flex-shrink-0">{n.icon}</span>
              <span className="font-medium text-[13px]">{n.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent-green)" }} />
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>管理者アクセス</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
