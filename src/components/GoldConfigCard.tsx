"use client";

import { useState } from "react";

const ALL_TIMEFRAMES = ["M1","M5","M15","M30","H1","H4","D1","W1"];

interface BarStat {
  symbol: string;
  timeframe: string;
  bar_count: number;
  oldest_bar: string;
  newest_bar: string;
}

export interface GoldConfig {
  id: string;
  canonical_symbol: string;
  broker_symbol: string;
  enabled: boolean;
  timeframes: string[];
  last_tick_at: string | null;
  last_bar_at: string | null;
  last_sync_at: string | null;
  stored_bars: number;
  earliest_bar_at: string | null;
  latest_bar_at: string | null;
  notes: string | null;
  bar_stats: BarStat[];
}

function DataFreshnessTag({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return <span style={{ color: "#9a9a9a", fontSize: 10 }}>―</span>;
  const diffH = (Date.now() - new Date(dateStr).getTime()) / 3600_000;
  const label = diffH < 1 ? "最新" : diffH < 24 ? "当日" : diffH < 168 ? "今週" : "古い";
  const color = diffH < 1 ? "#16a34a" : diffH < 24 ? "#16a34a" : diffH < 168 ? "#d97706" : "#dc2626";
  const bg = diffH < 24 ? "rgba(22,163,74,0.08)" : diffH < 168 ? "rgba(217,119,6,0.08)" : "rgba(220,38,38,0.08)";
  return (
    <span style={{ color, background: bg, padding: "1px 6px", borderRadius: 99, fontSize: 9, fontWeight: 700 }}>
      {label}
    </span>
  );
}

export function GoldConfigCard({ config: initial }: { config: GoldConfig }) {
  const [cfg, setCfg]       = useState(initial);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg]       = useState<string | null>(null);

  const TF_ORDER = ["M1","M5","M15","M30","H1","H4","D1","W1"];
  const sortedStats = [...cfg.bar_stats].sort(
    (a, b) => TF_ORDER.indexOf(a.timeframe) - TF_ORDER.indexOf(b.timeframe)
  );

  const toggleEnabled = async () => {
    setSaving(true);
    const newVal = !cfg.enabled;
    await fetch("/api/gold-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cfg.id, enabled: newVal }),
    });
    setCfg(c => ({ ...c, enabled: newVal }));
    setSaving(false);
  };

  const toggleTF = async (tf: string) => {
    const newTFs = cfg.timeframes.includes(tf)
      ? cfg.timeframes.filter(t => t !== tf)
      : [...cfg.timeframes, tf];
    setSaving(true);
    await fetch("/api/gold-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cfg.id, timeframes: newTFs }),
    });
    setCfg(c => ({ ...c, timeframes: newTFs }));
    setSaving(false);
  };

  const syncStats = async () => {
    setSyncing(true);
    setMsg(null);
    const res = await fetch("/api/gold-config", { method: "POST" });
    const data = await res.json();
    setMsg(data.ok ? `統計を更新しました（${data.updated}件）` : "エラー");
    // リロードして最新統計を表示
    setTimeout(() => window.location.reload(), 800);
    setSyncing(false);
  };

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xl font-black" style={{ color: "#1a1a1a" }}>{cfg.canonical_symbol}</span>
              <span className="text-sm px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(249,115,22,0.1)", color: "#ea580c" }}>
                {cfg.broker_symbol}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                background: cfg.enabled ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
                color: cfg.enabled ? "#16a34a" : "#dc2626",
              }}>
                {cfg.enabled ? "収集中" : "停止"}
              </span>
            </div>
            <p className="text-xs" style={{ color: "#9a9a9a" }}>
              broker: {cfg.broker_symbol} → canonical: {cfg.canonical_symbol}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={syncStats} disabled={syncing}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer", background: "rgba(0,0,0,0.04)", color: "#4a4a4a", border: "1px solid rgba(0,0,0,0.08)" }}>
              {syncing ? "更新中..." : "統計を更新"}
            </button>
            <button onClick={toggleEnabled} disabled={saving}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                background: cfg.enabled ? "rgba(220,38,38,0.08)" : "rgba(22,163,74,0.08)",
                color: cfg.enabled ? "#dc2626" : "#16a34a",
                border: `1px solid ${cfg.enabled ? "rgba(220,38,38,0.2)" : "rgba(22,163,74,0.2)"}`,
              }}>
              {saving ? "..." : cfg.enabled ? "停止" : "有効化"}
            </button>
          </div>
        </div>

        {msg && <p className="text-xs mt-2" style={{ color: "#16a34a" }}>{msg}</p>}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: "蓄積バー総数", value: cfg.stored_bars ? `${cfg.stored_bars.toLocaleString()}本` : "―" },
            { label: "最古データ", value: cfg.earliest_bar_at ? new Date(cfg.earliest_bar_at).toLocaleDateString("ja-JP") : "―" },
            { label: "最新データ", value: cfg.latest_bar_at ? new Date(cfg.latest_bar_at).toLocaleDateString("ja-JP") : "―" },
            { label: "最終同期", value: cfg.last_sync_at ? new Date(cfg.last_sync_at).toLocaleString("ja-JP") : "―" },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-3" style={{ background: "#f8f7f4" }}>
              <p className="text-[9px] font-semibold tracking-wide mb-1 uppercase" style={{ color: "#9a9a9a" }}>{item.label}</p>
              <p className="text-sm font-bold" style={{ color: "#1a1a1a" }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeframe settings */}
      <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <p className="text-[10px] font-bold tracking-widest mb-3 uppercase" style={{ color: "#9a9a9a" }}>収集時間足</p>
        <div className="flex flex-wrap gap-2">
          {ALL_TIMEFRAMES.map(tf => {
            const active = cfg.timeframes.includes(tf);
            const stat = sortedStats.find(s => s.timeframe === tf);
            return (
              <button key={tf} onClick={() => toggleTF(tf)}
                style={{
                  padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: active ? "rgba(249,115,22,0.12)" : "rgba(0,0,0,0.04)",
                  color: active ? "#ea580c" : "#9a9a9a",
                  border: `1.5px solid ${active ? "rgba(249,115,22,0.35)" : "rgba(0,0,0,0.08)"}`,
                }}>
                {tf}
                {stat && <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>
                  {Number(stat.bar_count).toLocaleString()}本
                </span>}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] mt-2" style={{ color: "#9a9a9a" }}>クリックで収集対象を切り替えられます</p>
      </div>

      {/* Per-timeframe breakdown */}
      {sortedStats.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>
              時間足別 詳細 （Supabase bar_data）
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                {["時間足", "バー数", "最古", "最新", "鮮度"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold text-xs" style={{ color: "#9a9a9a" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStats.map(row => (
                <tr key={row.timeframe} style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                  <td className="px-4 py-2.5">
                    <span className="font-bold text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(249,115,22,0.08)", color: "#ea580c" }}>
                      {row.timeframe}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: "#1a1a1a" }}>
                    {Number(row.bar_count).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "#4a4a4a" }}>
                    {new Date(row.oldest_bar).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "#4a4a4a" }}>
                    {new Date(row.newest_bar).toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-2.5">
                    <DataFreshnessTag dateStr={row.newest_bar} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
