"use client";

import { useEffect, useState, useCallback } from "react";
import type { TradingKnowledge } from "@/lib/knowledgeSchema";
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_MARKETS, KNOWLEDGE_TIMEFRAMES } from "@/lib/knowledgeSchema";

const NG = "#f97316";

// ── ステータスバッジ ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    DRAFT:    { bg: "#fff7ed", color: "#c2410c", label: "下書き" },
    ACTIVE:   { bg: "#f0fdf4", color: "#15803d", label: "有効"   },
    ARCHIVED: { bg: "#f8fafc", color: "#64748b", label: "無効"   },
  };
  const s = map[status] ?? { bg: "#f8fafc", color: "#64748b", label: status };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Knowledge入力フォームモーダル ─────────────────────────────────
const EMPTY_FORM = {
  title: "", category: "General", summary: "", content: "",
  ai_usage: "", market: ["GOLD"] as string[], timeframes: [] as string[],
  tags: [] as string[], source_type: "MANUAL", source_url: "",
  status: "DRAFT", editor_note: "",
};

function KnowledgeModal({
  item, onClose, onSaved,
}: {
  item: TradingKnowledge | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState(isEdit ? {
    title:       item!.title,
    category:    item!.category,
    summary:     item!.summary ?? "",
    content:     item!.content,
    ai_usage:    item!.ai_usage ?? "",
    market:      [...item!.market],
    timeframes:  [...item!.timeframes],
    tags:        [...item!.tags],
    source_type: item!.source_type,
    source_url:  item!.source_url ?? "",
    status:      item!.status,
    editor_note: item!.editor_note ?? "",
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [tagInput, setTagInput] = useState("");

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  function toggleArray(k: "market" | "timeframes", val: string) {
    const arr = form[k] as string[];
    set(k, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t || form.tags.includes(t)) { setTagInput(""); return; }
    set("tags", [...form.tags, t]);
    setTagInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url    = isEdit ? `/api/trading-knowledge/${item!.id}` : "/api/trading-knowledge";
      const method = isEdit ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source_url: form.source_url || undefined }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally { setSaving(false); }
  }

  // 入力共通スタイル
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
    border: "1px solid #e2e8f0", background: "#fff", color: "#1a1a1a", outline: "none",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black" style={{ color: "#1a1a1a" }}>
              {isEdit ? "Knowledge 編集" : "Knowledge 新規作成"}
            </h2>
            {isEdit && <p className="text-xs mt-0.5" style={{ color: "#9a9a9a" }}>v{item!.version} → v{item!.version + 1}に更新されます</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-gray-100" style={{ color: "#9a9a9a", fontSize: 18 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* タイトル */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#4a4a4a" }}>タイトル *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} required
              placeholder="例：ダウ理論" style={inputStyle} />
          </div>

          {/* カテゴリ + ステータス */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#4a4a4a" }}>カテゴリ</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} style={inputStyle}>
                {KNOWLEDGE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#4a4a4a" }}>ステータス</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} style={inputStyle}>
                <option value="DRAFT">下書き（AIが参照しない）</option>
                <option value="ACTIVE">有効（AIが参照可能）</option>
                <option value="ARCHIVED">無効化</option>
              </select>
            </div>
          </div>

          {/* 概要 */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#4a4a4a" }}>概要（500文字以内）</label>
            <textarea value={form.summary} onChange={e => set("summary", e.target.value)} rows={2}
              placeholder="このKnowledgeの簡単な説明" style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {/* 本文 */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#4a4a4a" }}>
              詳細Knowledge本文 * <span style={{ color: "#9a9a9a", fontWeight: 400 }}>（AIが参照する詳細な内容）</span>
            </label>
            <textarea value={form.content} onChange={e => set("content", e.target.value)} rows={6} required
              placeholder="AIトレーダーが判断に使う知識・ルール・考え方を詳しく書いてください"
              style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} />
          </div>

          {/* AIへの使用目的 */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#4a4a4a" }}>AIへの使用目的</label>
            <input value={form.ai_usage} onChange={e => set("ai_usage", e.target.value)}
              placeholder="例：トレンド方向の判断に利用する" style={inputStyle} />
          </div>

          {/* 対象Market */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "#4a4a4a" }}>対象Market</label>
            <div className="flex flex-wrap gap-2">
              {KNOWLEDGE_MARKETS.map(m => (
                <button key={m} type="button" onClick={() => toggleArray("market", m)}
                  className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                  style={{
                    background: form.market.includes(m) ? NG : "#fff",
                    color:      form.market.includes(m) ? "#fff" : "#64748b",
                    borderColor: form.market.includes(m) ? NG : "#e2e8f0",
                  }}>{m}</button>
              ))}
            </div>
          </div>

          {/* 対象Timeframe */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "#4a4a4a" }}>対象Timeframe</label>
            <div className="flex flex-wrap gap-2">
              {KNOWLEDGE_TIMEFRAMES.map(tf => (
                <button key={tf} type="button" onClick={() => toggleArray("timeframes", tf)}
                  className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                  style={{
                    background: form.timeframes.includes(tf) ? "#2563eb" : "#fff",
                    color:      form.timeframes.includes(tf) ? "#fff" : "#64748b",
                    borderColor: form.timeframes.includes(tf) ? "#2563eb" : "#e2e8f0",
                  }}>{tf}</button>
              ))}
            </div>
          </div>

          {/* タグ */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "#4a4a4a" }}>タグ</label>
            <div className="flex gap-2 mb-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="例：trend（Enterで追加）"
                style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={addTag}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: NG, whiteSpace: "nowrap" }}>追加</button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: "#fff7ed", color: NG }}>
                  #{tag}
                  <button type="button" onClick={() => set("tags", form.tags.filter(t => t !== tag))}
                    className="hover:text-red-500" style={{ color: "#fdba74" }}>✕</button>
                </span>
              ))}
            </div>
          </div>

          {/* 登録方法 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#4a4a4a" }}>登録方法</label>
              <select value={form.source_type} onChange={e => set("source_type", e.target.value)} style={inputStyle}>
                <option value="MANUAL">手動入力</option>
                <option value="URL">URLから追加</option>
                <option value="AI_GENERATED">AI生成（要確認）</option>
              </select>
            </div>
            {form.source_type === "URL" && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#4a4a4a" }}>Source URL</label>
                <input value={form.source_url} onChange={e => set("source_url", e.target.value)}
                  type="url" placeholder="https://" style={inputStyle} />
              </div>
            )}
          </div>

          {/* 編集メモ */}
          {isEdit && (
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#4a4a4a" }}>変更メモ（任意）</label>
              <input value={form.editor_note} onChange={e => set("editor_note", e.target.value)}
                placeholder="今回の変更内容のメモ" style={inputStyle} />
            </div>
          )}

          {error && (
            <div className="rounded-lg p-3" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2" style={{ borderTop: "1px solid #f1f5f9" }}>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold border"
              style={{ color: "#64748b", borderColor: "#e2e8f0" }}>キャンセル</button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all"
              style={{
                background: saving ? "#94a3b8" : "linear-gradient(135deg, #f97316, #ea580c)",
                boxShadow: saving ? "none" : "0 2px 8px rgba(249,115,22,0.3)",
              }}>
              {saving ? "保存中..." : isEdit ? "更新する" : "作成する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Knowledgeカード ───────────────────────────────────────────────
function KnowledgeCard({
  item,
  onEdit,
  onStatusChange,
}: {
  item: TradingKnowledge;
  onEdit: (k: TradingKnowledge) => void;
  onStatusChange: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function activate(active: boolean) {
    setLoading(true);
    await fetch(`/api/trading-knowledge/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: active ? "ACTIVE" : "DRAFT" }),
    });
    onStatusChange();
    setLoading(false);
  }

  async function archive() {
    if (!confirm(`「${item.title}」を無効化しますか？`)) return;
    setLoading(true);
    await fetch(`/api/trading-knowledge/${item.id}`, { method: "DELETE" });
    onStatusChange();
    setLoading(false);
  }

  return (
    <div className="rounded-2xl p-5"
      style={{
        background: "#fff",
        border: "1px solid #f1f5f9",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <StatusBadge status={item.status} />
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: "#fff7ed", color: NG }}>{item.category}</span>
            <span className="text-[11px]" style={{ color: "#94a3b8" }}>v{item.version}</span>
            {item.market.map(m => (
              <span key={m} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: "#eff6ff", color: "#2563eb" }}>{m}</span>
            ))}
          </div>
          <h3 className="text-[15px] font-bold" style={{ color: "#1a1a1a" }}>{item.title}</h3>
          {item.summary && (
            <p className="text-xs mt-1 line-clamp-2" style={{ color: "#64748b" }}>{item.summary}</p>
          )}
          {item.ai_usage && (
            <p className="text-[11px] mt-1.5 font-medium" style={{ color: "#d97706" }}>
              🤖 使用目的: {item.ai_usage}
            </p>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex items-center gap-1.5 shrink-0">
          {item.status !== "ARCHIVED" && (
            <button onClick={() => activate(item.status !== "ACTIVE")} disabled={loading}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all"
              style={{
                background: item.status === "ACTIVE" ? "#f8fafc" : "#f0fdf4",
                color:      item.status === "ACTIVE" ? "#64748b" : "#15803d",
                borderColor: item.status === "ACTIVE" ? "#e2e8f0" : "#bbf7d0",
              }}>
              {loading ? "..." : item.status === "ACTIVE" ? "下書きに戻す" : "有効化"}
            </button>
          )}
          <button onClick={() => onEdit(item)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all"
            style={{ background: "#fff7ed", color: NG, borderColor: "#fed7aa" }}>
            編集
          </button>
          {item.status !== "ARCHIVED" && (
            <button onClick={archive} disabled={loading}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all"
              style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }}>
              無効化
            </button>
          )}
        </div>
      </div>

      {/* Timeframe + Tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        {item.timeframes.map(tf => (
          <span key={tf} className="px-2 py-0.5 rounded text-[10px] font-semibold"
            style={{ background: "#f1f5f9", color: "#475569" }}>{tf}</span>
        ))}
        {item.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded-full text-[10px]"
            style={{ background: "#fafafa", color: "#94a3b8" }}>#{tag}</span>
        ))}
      </div>
    </div>
  );
}

// ── メインページ ──────────────────────────────────────────────────
export default function TradingKnowledgePage() {
  const [items,   setItems]   = useState<TradingKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("ALL");
  const [modal,   setModal]   = useState<"create" | TradingKnowledge | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const url  = filter === "ALL" ? "/api/trading-knowledge" : `/api/trading-knowledge?status=${filter}`;
    const res  = await fetch(url);
    const data = await res.json() as { items?: TradingKnowledge[] };
    setItems(data.items ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const activeCount = items.filter(i => i.status === "ACTIVE").length;
  const draftCount  = items.filter(i => i.status === "DRAFT").length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "#1a1a1a" }}>AIトレード知識</h2>
          <p className="text-sm mt-1" style={{ color: "#9a9a9a" }}>
            AIトレーダーが参照する Trading Knowledge を管理します
          </p>
        </div>
        <button
          onClick={() => setModal("create")}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
          }}>
          + Knowledge 追加
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "総Knowledge数", value: items.length,   color: "#1a1a1a" },
          { label: "有効（ACTIVE）", value: activeCount,   color: "#15803d" },
          { label: "下書き（DRAFT）", value: draftCount,   color: "#c2410c" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4"
            style={{ background: "#fff", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#9a9a9a" }}>{s.label}</p>
            <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* フィルタータブ */}
      <div className="flex items-center gap-2">
        {[
          { key: "ALL",      label: "すべて" },
          { key: "DRAFT",    label: "下書き" },
          { key: "ACTIVE",   label: "有効"   },
          { key: "ARCHIVED", label: "無効化済み" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold border transition-all"
            style={{
              background:   filter === f.key ? NG : "#fff",
              color:        filter === f.key ? "#fff" : "#64748b",
              borderColor:  filter === f.key ? NG : "#e2e8f0",
            }}>
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: "#9a9a9a" }}>{items.length}件</span>
      </div>

      {/* コンテンツ */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: "#f1f5f9", borderTopColor: NG }} />
          <p className="text-sm" style={{ color: "#94a3b8" }}>読み込み中...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-16 text-center"
          style={{ background: "#fff", border: "1px dashed #e2e8f0" }}>
          <div className="text-5xl mb-4">📚</div>
          <p className="text-base font-bold mb-1" style={{ color: "#4a4a4a" }}>Knowledgeがまだありません</p>
          <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>
            「+ Knowledge 追加」からダウ理論・プライスアクション等を登録してください
          </p>
          <button onClick={() => setModal("create")}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
            最初のKnowledgeを追加
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <KnowledgeCard key={item.id} item={item}
              onEdit={k => setModal(k)}
              onStatusChange={load} />
          ))}
        </div>
      )}

      {/* モーダル */}
      {modal && (
        <KnowledgeModal
          item={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); void load(); }}
        />
      )}
    </div>
  );
}
