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
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{
        background: "linear-gradient(180deg, #f97316 0%, #ea580c 100%)",
      }}>
        {/* Brand */}
        <div className="px-5 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-orange-500 text-sm font-black flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.95)" }}>A</div>
            <div>
              <p className="text-[9px] tracking-[0.25em] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>AVLFX</p>
              <h1 className="text-[13px] font-black tracking-wider text-white">CONSOLE</h1>
            </div>
          </div>
          <p className="text-[9px] mt-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            管理者専用コントロールパネル
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{
                color: "rgba(255,255,255,0.85)",
                background: "transparent",
              }}
            >
              <span className="w-5 text-center text-base flex-shrink-0 opacity-90">{n.icon}</span>
              <span className="font-medium text-[13px]">{n.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.7)" }} />
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.55)" }}>管理者アクセス</p>
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
