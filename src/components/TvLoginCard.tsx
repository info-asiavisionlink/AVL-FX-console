"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TvLoginCardProps {
  customerId: string;
  email: string;
  tvPassword: string | null;
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

export function TvLoginCard({ customerId, email, tvPassword }: TvLoginCardProps) {
  const [showPw,   setShowPw]   = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [newPw,    setNewPw]    = useState("");
  const [showNew,  setShowNew]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const router = useRouter();

  const APP_URL = "https://avl-fx.vercel.app";

  function generatePassword(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
    return Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => chars[b % chars.length]).join("");
  }

  const handleSave = async () => {
    if (!newPw.trim()) { setError("パスワードを入力してください"); return; }
    setSaving(true);
    setError(null);
    try {
      // setup API を呼んで TV パスワードを更新
      const res = await fetch(`/api/customers/${customerId}/setup`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password: newPw.trim() }),
        signal:  AbortSignal.timeout(28_000),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "保存に失敗しました"); return; }
      setEditing(false);
      setNewPw("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const display = tvPassword
    ? (showPw ? tvPassword : "●".repeat(Math.min(tvPassword.length, 16)))
    : null;

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{
      background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    }}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#9a9a9a" }}>
          TV ログイン情報
        </p>
        <button
          onClick={() => { setEditing(e => !e); setNewPw(""); setError(null); }}
          style={{
            padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: "rgba(249,115,22,0.08)", color: "#f97316",
            border: "1px solid rgba(249,115,22,0.2)", cursor: "pointer",
          }}
        >
          {editing ? "キャンセル" : "パスワード変更"}
        </button>
      </div>

      {/* URL */}
      <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <span className="text-[10px] font-bold w-28 shrink-0" style={{ color: "#9a9a9a" }}>URL</span>
        <span className="text-xs font-mono flex-1" style={{ color: "#1a1a1a" }}>{APP_URL}</span>
        <CopyButton value={APP_URL} />
      </div>

      {/* ログインID（メール） */}
      <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <span className="text-[10px] font-bold w-28 shrink-0" style={{ color: "#9a9a9a" }}>ログインID</span>
        <span className="text-xs font-mono flex-1" style={{ color: "#1a1a1a" }}>{email}</span>
        <CopyButton value={email} />
      </div>

      {/* パスワード */}
      <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <span className="text-[10px] font-bold w-28 shrink-0" style={{ color: "#9a9a9a" }}>パスワード</span>
        {display ? (
          <>
            <span className="text-xs font-mono flex-1" style={{ color: "#1a1a1a" }}>{display}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setShowPw(s => !s)} style={{
                padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                background: "rgba(0,0,0,0.05)", color: "#9a9a9a",
                border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer",
              }}>
                {showPw ? "隠す" : "表示"}
              </button>
              <CopyButton value={tvPassword!} />
            </div>
          </>
        ) : (
          <span className="text-xs flex-1" style={{ color: "#9a9a9a" }}>
            未設定（セットアップを実行してください）
          </span>
        )}
      </div>

      {/* パスワード変更フォーム */}
      {editing && (
        <div className="space-y-3 pt-1">
          <p className="text-xs font-bold" style={{ color: "#1a1a1a" }}>新しいパスワードを設定</p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                type={showNew ? "text" : "password"}
                placeholder="新しいパスワード"
                style={{
                  width: "100%", padding: "9px 60px 9px 12px", borderRadius: 10, fontSize: 13,
                  background: "#f8f7f4", border: "1.5px solid rgba(0,0,0,0.1)", color: "#1a1a1a", outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(s => !s)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  fontSize: 11, fontWeight: 700, color: "#9a9a9a", background: "none", border: "none", cursor: "pointer",
                }}
              >
                {showNew ? "隠す" : "表示"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNewPw(generatePassword())}
              style={{
                padding: "9px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                background: "rgba(249,115,22,0.08)", color: "#f97316",
                border: "1.5px solid rgba(249,115,22,0.25)", cursor: "pointer",
              }}
            >
              自動生成
            </button>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "#dc2626" }}>⚠ {error}</p>
          )}

          <div className="rounded-xl px-4 py-2" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <p className="text-[10px]" style={{ color: "#d97706" }}>
              ⚠ 変更すると TV の Supabase ユーザーパスワードも更新されます（MT5 Connection Token も再生成されます）
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !newPw.trim()}
            style={{
              padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff", cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
              opacity: (saving || !newPw.trim()) ? 0.6 : 1,
            }}
          >
            {saving ? "更新中..." : "パスワードを更新"}
          </button>
        </div>
      )}
    </div>
  );
}
