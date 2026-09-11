import { getAdminSupabase, getGatewayConfig } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchGatewayHealth() {
  const { url, secret } = getGatewayConfig();
  if (!url) return null;
  try {
    const res = await fetch(`${url}/health`, {
      headers: { "x-gateway-secret": secret },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchMarketDataStats() {
  try {
    const sb = await getAdminSupabase();
    const { data } = await sb
      .from("bar_data")
      .select("symbol, timeframe, time_utc")
      .order("time_utc", { ascending: false })
      .limit(500);
    if (!data) return { totalBars: 0, symbols: [], latestBar: null };
    const symbolMap = new Map<string, { bars: number; latest: string }>();
    for (const row of data) {
      const cur = symbolMap.get(row.symbol);
      if (!cur) symbolMap.set(row.symbol, { bars: 1, latest: row.time_utc });
      else { cur.bars++; if (row.time_utc > cur.latest) cur.latest = row.time_utc; }
    }
    return {
      totalBars: data.length,
      symbols: Array.from(symbolMap.entries()).map(([sym, v]) => ({ symbol: sym, ...v })),
      latestBar: data[0]?.time_utc ?? null,
    };
  } catch { return { totalBars: 0, symbols: [], latestBar: null }; }
}

async function fetchSupabaseStatus() {
  try {
    const sb = await getAdminSupabase();
    const { count, error } = await sb.from("bar_data").select("*", { count: "exact", head: true });
    return { ok: !error, totalRows: count ?? 0 };
  } catch { return { ok: false, totalRows: 0 }; }
}

function StatusBadge({ status }: { status: "ok" | "warn" | "error" | "unknown" }) {
  const cfg = {
    ok:      { label: "正常",   color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
    warn:    { label: "注意",   color: "#d97706", bg: "rgba(217,119,6,0.08)" },
    error:   { label: "エラー", color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
    unknown: { label: "不明",   color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
  }[status];
  return (
    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
      style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    }}>
      <p className="text-[10px] font-bold tracking-widest mb-4 uppercase" style={{ color: "var(--text-muted)" }}>{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value, sub, status }: { label: string; value: string; sub?: string; status?: "ok" | "warn" | "error" | "unknown" }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{value}</span>
          {sub && <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{sub}</p>}
        </div>
        {status && <StatusBadge status={status} />}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [gateway, marketStats, sbStatus] = await Promise.all([
    fetchGatewayHealth(),
    fetchMarketDataStats(),
    fetchSupabaseStatus(),
  ]);

  const gatewayOk   = !!gateway;
  const eaConnected = !!(gateway?.eaConnected);
  const lastTick    = gateway?.lastTickTs ? new Date(gateway.lastTickTs).toLocaleString("ja-JP") : "―";
  const tfCount     = ((gateway?.barKeys as string[]) ?? []).length;
  const uptimeSec   = (gateway as { uptime?: number } | null)?.uptime ?? 0;
  const uptimeStr   = uptimeSec > 0
    ? `${Math.floor(uptimeSec / 3600)}時間 ${Math.floor((uptimeSec % 3600) / 60)}分`
    : "―";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>ダッシュボード</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>AVL-FX プラットフォーム管理 — 管理者専用</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "MT5 DataManager", status: (eaConnected ? "ok" : "warn") as "ok"|"warn",  value: eaConnected ? "接続中" : "未接続" },
          { label: "ゲートウェイ",     status: (gatewayOk ? "ok" : "error") as "ok"|"error", value: gatewayOk ? "オンライン" : "オフライン" },
          { label: "Supabase",        status: (sbStatus.ok ? "ok" : "error") as "ok"|"error", value: sbStatus.ok ? "正常" : "エラー" },
          { label: "蓄積バー総数",      status: "ok" as "ok",                                   value: sbStatus.totalRows.toLocaleString() + " 本" },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-5" style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <p className="text-[10px] font-semibold tracking-wide mb-3 uppercase" style={{ color: "var(--text-muted)" }}>{item.label}</p>
            <div className="flex items-end justify-between gap-2">
              <span className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{item.value}</span>
              <StatusBadge status={item.status} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Gateway */}
        <Card title="ゲートウェイ状態">
          <Row label="接続状態"       value={gatewayOk ? "オンライン" : "オフライン"} status={(gatewayOk ? "ok" : "error") as "ok"|"error"} />
          <Row label="EA接続"         value={eaConnected ? "接続中" : "未接続"} status={(eaConnected ? "ok" : "warn") as "ok"|"warn"} />
          <Row label="最終Tick受信"   value={lastTick} />
          <Row label="受信中TF数"     value={`${tfCount} 個`} sub="シンボル×時間足の組み合わせ数" />
          <Row label="稼働時間"        value={uptimeStr} />
          {!gateway && <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>⚠ ゲートウェイに接続できません — Railway の状態を確認してください</p>}
        </Card>

        {/* Market Data */}
        <Card title="直近の市場データ">
          <Row label="受信シンボル数" value={`${marketStats.symbols.length} 銘柄`} />
          <Row label="最新バー時刻"   value={marketStats.latestBar ? new Date(marketStats.latestBar).toLocaleString("ja-JP") : "―"} />
          {marketStats.symbols.slice(0, 5).map(s => (
            <Row key={s.symbol} label={s.symbol}
              value={`${new Date(s.latest).toLocaleString("ja-JP")}`}
              sub="最新バー時刻"
              status="ok" />
          ))}
          {marketStats.symbols.length === 0 && <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>bar_dataにデータがありません</p>}
        </Card>

        {/* Architecture */}
        <Card title="データフロー">
          <div className="space-y-2">
            {[
              { icon: "🖥️", text: "Admin MT5", sub: "AVL_DataManager EA が稼働中" },
              { icon: "🔀", text: "Gateway (Railway)", sub: "手動同期ボタンでSupabaseへ保存" },
              { icon: "🗄️", text: "Console Supabase (bar_data)", sub: "市場データ置き場" },
            ].map((item, i, arr) => (
              <div key={i}>
                <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.08)" }}>
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.text}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{item.sub}</p>
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex justify-center py-1">
                    <span className="text-sm" style={{ color: "rgba(249,115,22,0.4)" }}>↓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Supabase */}
        <Card title="Supabase 状態">
          <Row label="接続状態"        value={sbStatus.ok ? "正常" : "エラー"} status={(sbStatus.ok ? "ok" : "error") as "ok"|"error"} />
          <Row label="蓄積バー総数"    value={`${sbStatus.totalRows.toLocaleString()} 本`} sub="チャート・バックテストに使用される全期間データ" />
          <Row label="Trading View提供" value={sbStatus.ok && sbStatus.totalRows > 0 ? "提供可能" : "データ不足"} status={(sbStatus.totalRows > 0 ? "ok" : "warn") as "ok"|"warn"} />
        </Card>
      </div>
    </div>
  );
}
