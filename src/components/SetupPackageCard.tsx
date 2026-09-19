"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SetupPackage {
  app_url:          string;
  email:            string;
  temp_password:    string;
  is_new_tv_user:   boolean;
  gateway_url:      string;
  connection_id:    string;
  connection_token: string;
  research_token:   string;
  customer_code:    string;
  display_name:     string;
  generated_at:     string;
}

interface ExistingSetup {
  app_url:          string;
  gateway_url:      string;
  email:            string;
  tv_user_exists:   boolean;
  connection_id:    string | null;
  research_enabled: boolean;
  tokens:           { id: string; token_name: string; is_active: boolean; created_at: string }[];
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handle} style={{
      padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
      background: copied ? "rgba(22,163,74,0.12)" : "rgba(249,115,22,0.10)",
      color:      copied ? "#16a34a" : "#f97316",
      border:     `1px solid ${copied ? "rgba(22,163,74,0.25)" : "rgba(249,115,22,0.25)"}`,
      cursor:     "pointer", whiteSpace: "nowrap",
    }}>
      {copied ? "✓ コピー済み" : "コピー"}
    </button>
  );
}

function PackageRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow] = useState(false);
  const display = secret && !show ? "●".repeat(Math.min(value.length, 16)) : value;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
      <span className="text-[10px] font-bold w-36 shrink-0 pt-0.5" style={{ color: "#9a9a9a" }}>{label}</span>
      <span className="text-xs font-mono flex-1 break-all" style={{ color: "#1a1a1a" }}>{display}</span>
      <div className="flex items-center gap-1 shrink-0">
        {secret && (
          <button onClick={() => setShow(s => !s)} style={{
            padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: "rgba(0,0,0,0.05)", color: "#9a9a9a", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer",
          }}>
            {show ? "隠す" : "表示"}
          </button>
        )}
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function CopyAllButton({ pkg }: { pkg: SetupPackage }) {
  const [copied, setCopied] = useState(false);

  const text = `【AVL FX セットアップ情報】${pkg.display_name} 様

━━ Trading View ログイン ━━
URL       : ${pkg.app_url}
メール    : ${pkg.email}
パスワード: ${pkg.temp_password}

━━ MT5 Bridge EA 設定 ━━
Gateway URL     : ${pkg.gateway_url}
Connection ID   : ${pkg.connection_id}
Connection Token: ${pkg.connection_token}

※ Connection Token は再発行すると古いものは無効になります。
※ 初回ログイン後にパスワードを変更することを推奨します。

発行日時: ${new Date(pkg.generated_at).toLocaleString("ja-JP")}`;

  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <button onClick={handle} style={{
      padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700,
      background: copied ? "rgba(22,163,74,0.12)" : "rgba(249,115,22,0.12)",
      color:      copied ? "#16a34a" : "#f97316",
      border:     `1px solid ${copied ? "rgba(22,163,74,0.3)" : "rgba(249,115,22,0.3)"}`,
      cursor:     "pointer",
    }}>
      {copied ? "✓ コピー完了" : "📋 全部コピー（顧客送付用）"}
    </button>
  );
}

// =================================================================
// Main Component
// =================================================================
export function SetupPackageCard({ customerId, existingSetup }: {
  customerId:    string;
  existingSetup: ExistingSetup | null;
}) {
  const [generating, setGenerating] = useState(false);
  const [pkg,        setPkg]        = useState<SetupPackage | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setPkg(null);

    const res  = await fetch(`/api/customers/${customerId}/setup`, {
      method:  "POST",
      signal:  AbortSignal.timeout(28_000),
    });
    const data = await res.json() as { ok?: boolean; package?: SetupPackage; error?: string };

    if (!res.ok || !data.package) {
      setError(data.error ?? "生成に失敗しました");
      setGenerating(false);
      return;
    }

    setPkg(data.package);
    setGenerating(false);
    router.refresh();
  };

  const statusColor = existingSetup?.tv_user_exists ? "#16a34a" : "#9a9a9a";
  const statusLabel = existingSetup?.tv_user_exists ? "セットアップ済み" : "未セットアップ";

  return (
    <div className="space-y-4">
      {/* ステータス＋生成ボタン */}
      <div className="rounded-2xl p-5 space-y-4" style={{
        background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "#9a9a9a" }}>
              セットアップ状況
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
              <span className="text-sm font-bold" style={{ color: statusColor }}>{statusLabel}</span>
              {existingSetup?.tv_user_exists && existingSetup.connection_id && (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded"
                  style={{ background: "rgba(0,0,0,0.04)", color: "#9a9a9a" }}>
                  ID: {existingSetup.connection_id.slice(0, 8)}...
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff", cursor: generating ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating
              ? "生成中..."
              : existingSetup?.tv_user_exists
                ? "🔄 再生成（トークン更新）"
                : "✨ セットアップを生成"}
          </button>
        </div>

        {/* 既存セットアップのサマリー */}
        {existingSetup?.tv_user_exists && !pkg && (
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: "#f8f7f4", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: "#9a9a9a" }}>Trading View URL</span>
              <span className="font-mono font-bold" style={{ color: "#1a1a1a" }}>{existingSetup.app_url}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "#9a9a9a" }}>メール</span>
              <span className="font-mono font-bold" style={{ color: "#1a1a1a" }}>{existingSetup.email}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "#9a9a9a" }}>Research アクセス</span>
              <span className="font-bold" style={{ color: existingSetup.research_enabled ? "#16a34a" : "#dc2626" }}>
                {existingSetup.research_enabled ? "有効" : "無効"}
              </span>
            </div>
            <p className="text-[9px] pt-1" style={{ color: "#9a9a9a" }}>
              ※ パスワード・Connection Token を再発行するには「再生成」を押してください
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl px-4 py-3" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <p className="text-sm" style={{ color: "#dc2626" }}>⚠ {error}</p>
          </div>
        )}
      </div>

      {/* 生成されたパッケージ */}
      {pkg && (
        <div className="rounded-2xl overflow-hidden" style={{
          background: "#fff", border: "2px solid rgba(249,115,22,0.25)",
          boxShadow: "0 4px 20px rgba(249,115,22,0.08)",
        }}>
          {/* ヘッダー */}
          <div className="px-5 py-3 flex items-center justify-between" style={{
            background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(234,88,12,0.04))",
            borderBottom: "1px solid rgba(249,115,22,0.15)",
          }}>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#f97316" }}>
                📦 セットアップパッケージ
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#4a4a4a" }}>
                {pkg.display_name} / {new Date(pkg.generated_at).toLocaleString("ja-JP")}
                {pkg.is_new_tv_user && (
                  <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" }}>
                    新規ユーザー作成
                  </span>
                )}
              </p>
            </div>
            <CopyAllButton pkg={pkg} />
          </div>

          {/* パッケージ内容 */}
          <div className="px-5 py-1">
            <p className="text-[9px] font-bold tracking-widest mt-3 mb-1" style={{ color: "#9a9a9a" }}>
              TRADING VIEW ログイン
            </p>
            <PackageRow label="URL"        value={pkg.app_url} />
            <PackageRow label="メール"     value={pkg.email} />
            <PackageRow label="仮パスワード" value={pkg.temp_password} secret />

            <p className="text-[9px] font-bold tracking-widest mt-4 mb-1" style={{ color: "#9a9a9a" }}>
              MT5 BRIDGE EA 設定
            </p>
            <PackageRow label="Gateway URL"      value={pkg.gateway_url} />
            <PackageRow label="Connection ID"    value={pkg.connection_id} />
            <PackageRow label="Connection Token" value={pkg.connection_token} secret />

            <div className="rounded-xl px-4 py-2.5 my-3" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <p className="text-[10px] leading-relaxed" style={{ color: "#d97706" }}>
                ⚠ Connection Token はこの画面を閉じると二度と表示されません。
                必ず「全部コピー」してから閉じてください。
                再発行する場合は「再生成」ボタンを押してください（古いトークンは無効になります）。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
