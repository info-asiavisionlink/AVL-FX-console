"use client";

import { useState } from "react";

interface SyncResult {
  ok: boolean;
  total: number;
  byKey: Record<string, number>;
  skipped: number;
  duration: number;
  memoryBars: number;
  message: string;
  error?: string;
}

export function SyncButton({ gatewayMemoryBars }: { gatewayMemoryBars: number }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const handleSync = async () => {
    setStatus("loading");
    setResult(null);

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data: SyncResult = await res.json();

      if (!res.ok || data.error) {
        setResult({ ...data, ok: false });
        setStatus("error");
      } else {
        setResult(data);
        setStatus("done");
        setLastSyncAt(new Date().toLocaleString("ja-JP"));
      }
    } catch (e) {
      setResult({ ok: false, total: 0, byKey: {}, skipped: 0, duration: 0, memoryBars: 0, message: "", error: String(e) });
      setStatus("error");
    }
  };

  const isLoading = status === "loading";
  const canSync   = gatewayMemoryBars > 0 && !isLoading;

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div>
        <p className="text-[9px] font-black tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>手動同期</p>
        <h2 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>Supabaseへ同期</h2>
        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          Gatewayメモリ内の新しいバーだけを前回保存以降から差分でSupabaseに登録します
        </p>
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
          <p className="text-[9px] tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Gatewayメモリ</p>
          <p className="text-lg font-black font-mono" style={{ color: gatewayMemoryBars > 0 ? "var(--accent-cyan)" : "var(--text-muted)" }}>
            {gatewayMemoryBars > 0 ? `${gatewayMemoryBars.toLocaleString()}本` : "なし"}
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {gatewayMemoryBars > 0 ? "EA受信済み・同期待ち" : "EAをアタッチしてください"}
          </p>
        </div>
        <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
          <p className="text-[9px] tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>前回同期</p>
          <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
            {lastSyncAt ?? "未実行"}
          </p>
          {result?.total != null && (
            <p className="text-[9px] mt-0.5" style={{ color: "var(--accent-green)" }}>
              +{result.total.toLocaleString()}本 追加
            </p>
          )}
        </div>
      </div>

      {/* Sync Button */}
      <button
        onClick={handleSync}
        disabled={!canSync}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: "900",
          letterSpacing: "0.1em",
          cursor: canSync ? "pointer" : "not-allowed",
          background: isLoading
            ? "rgba(0,229,255,0.05)"
            : canSync
            ? "rgba(0,229,255,0.15)"
            : "rgba(255,255,255,0.04)",
          color: canSync ? "var(--accent-cyan)" : "var(--text-muted)",
          border: `1px solid ${canSync ? "rgba(0,229,255,0.4)" : "rgba(255,255,255,0.08)"}`,
          transition: "all 0.2s",
        }}
      >
        {isLoading ? "同期中..." : "Supabaseへ同期 →"}
      </button>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>⏳</span>
          <span>差分データをSupabaseに書き込んでいます...</span>
        </div>
      )}

      {/* Result */}
      {result && status !== "loading" && (
        <div className="rounded-lg p-4 space-y-2" style={{
          background: result.ok ? "rgba(0,255,136,0.05)" : "rgba(248,113,113,0.05)",
          border: `1px solid ${result.ok ? "rgba(0,255,136,0.2)" : "rgba(248,113,113,0.2)"}`,
        }}>
          <p className="text-xs font-bold" style={{ color: result.ok ? "var(--accent-green)" : "#f87171" }}>
            {result.ok ? "✓ 完了" : "✗ エラー"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{result.message || result.error}</p>

          {result.ok && result.total > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-[9px] font-black tracking-widest" style={{ color: "var(--text-muted)" }}>追加内訳</p>
              {Object.entries(result.byKey)
                .sort(([,a],[,b]) => b - a)
                .map(([key, count]) => (
                  <div key={key} className="flex justify-between text-[10px] font-mono">
                    <span style={{ color: "var(--text-secondary)" }}>{key}</span>
                    <span style={{ color: "var(--accent-cyan)" }}>+{count.toLocaleString()}本</span>
                  </div>
                ))}
              <p className="text-[9px] pt-1" style={{ color: "var(--text-muted)" }}>
                所要時間: {result.duration}秒 / スキップ: {result.skipped}TF（変更なし）
              </p>
            </div>
          )}
        </div>
      )}

      {/* Guide */}
      {!canSync && !isLoading && (
        <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[9px] font-black tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>手順</p>
          {[
            "① MT5でEAをチャートにアタッチ",
            "② EAがGatewayへデータ送信（数秒）",
            "③ このページをリロード",
            "④「Supabaseへ同期」ボタンをクリック",
            "⑤ 完了後にEAをデタッチ（任意）",
          ].map(s => (
            <p key={s} className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{s}</p>
          ))}
        </div>
      )}
    </div>
  );
}
