"use client";

import { useEffect, useState, useCallback } from "react";
import type { TradingKnowledge } from "@/lib/knowledgeSchema";
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_MARKETS, KNOWLEDGE_TIMEFRAMES, KNOWLEDGE_STATUSES } from "@/lib/knowledgeSchema";

// ── Color ──────────────────────────────────────────────────────────────────
const NG = "#f97316";

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    DRAFT:    { bg: "#d97706", label: "下書き" },
    ACTIVE:   { bg: "#16a34a", label: "有効"   },
    ARCHIVED: { bg: "#64748b", label: "無効"   },
  };
  const { bg, label } = map[status] ?? { bg: "#64748b", label: status };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-white"
      style={{ background: bg }}>
      {label}
    </span>
  );
}

// ── Empty form ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  title: "", category: "General", summary: "", content: "",
  ai_usage: "", market: ["GOLD"], timeframes: [] as string[],
  tags: [] as string[], source_type: "MANUAL", source_url: "",
  status: "DRAFT" as string, editor_note: "",
};

// ── Knowledge Form Modal ───────────────────────────────────────────────────
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
    market:      item!.market,
    timeframes:  item!.timeframes,
    tags:        item!.tags,
    source_type: item!.source_type,
    source_url:  item!.source_url ?? "",
    status:      item!.status,
    editor_note: item!.editor_note ?? "",
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [tagInput, setTagInput] = useState("");

  function set(k: string, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }

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
        body: JSON.stringify({
          ...form,
          source_url: form.source_url || undefined,
          tags: form.tags,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: "#1a1a2e", border: "1px solid rgba(249,115,22,0.2)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? "Knowledge 編集" : "Knowledge 新規作成"}
            {isEdit && <span className="ml-2 text-xs text-gray-400">v{item!.version} → v{item!.version + 1}</span>}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* タイトル */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">タイトル *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} required
              placeholder="例：ダウ理論"
              className="w-full px-3 py-2 rounded-lg text-sm text-white"
              style={{ background: "#0f0f1a", border: "1px solid rgba(249,115,22,0.3)" }} />
          </div>

          {/* カテゴリ + ステータス */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">カテゴリ</label>
              <select value={form.category} onChange={e => set("category", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{ background: "#0f0f1a", border: "1px solid rgba(249,115,22,0.3)" }}>
                {KNOWLEDGE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">ステータス</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{ background: "#0f0f1a", border: "1px solid rgba(249,115,22,0.3)" }}>
                {KNOWLEDGE_STATUSES.map(s => (
                  <option key={s} value={s}>{s === "DRAFT" ? "下書き" : s === "ACTIVE" ? "有効（ACTIVE）" : "無効（ARCHIVED）"}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">概要（500文字以内）</label>
            <textarea value={form.summary} onChange={e => set("summary", e.target.value)} rows={2}
              placeholder="このKnowledgeの概要"
              className="w-full px-3 py-2 rounded-lg text-sm text-white resize-y"
              style={{ background: "#0f0f1a", border: "1px solid rgba(249,115,22,0.3)" }} />
          </div>

          {/* 詳細Knowledge */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">詳細Knowledge本文 *</label>
            <textarea value={form.content} onChange={e => set("content", e.target.value)} rows={6} required
              placeholder="AIが参照する詳細な知識・ルール・判断基準を記述してください"
              className="w-full px-3 py-2 rounded-lg text-sm text-white resize-y font-mono"
              style={{ background: "#0f0f1a", border: "1px solid rgba(249,115,22,0.3)" }} />
          </div>

          {/* AIへの使用目的 */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">AIへの使用目的</label>
            <input value={form.ai_usage} onChange={e => set("ai_usage", e.target.value)}
              placeholder="例：トレンド方向の判断に利用する"
              className="w-full px-3 py-2 rounded-lg text-sm text-white"
              style={{ background: "#0f0f1a", border: "1px solid rgba(249,115,22,0.3)" }} />
          </div>

          {/* 対象Market */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">対象Market</label>
            <div className="flex flex-wrap gap-2">
              {KNOWLEDGE_MARKETS.map(m => (
                <button key={m} type="button"
                  onClick={() => toggleArray("market", m)}
                  className="px-2 py-1 rounded text-xs font-medium transition-all"
                  style={{
                    background: form.market.includes(m) ? NG : "#0f0f1a",
                    color: form.market.includes(m) ? "white" : "#94a3b8",
                    border: `1px solid ${form.market.includes(m) ? NG : "rgba(100,116,139,0.3)"}`,
                  }}>{m}</button>
              ))}
            </div>
          </div>

          {/* 対象Timeframe */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">対象Timeframe（複数可）</label>
            <div className="flex flex-wrap gap-2">
              {KNOWLEDGE_TIMEFRAMES.map(tf => (
                <button key={tf} type="button"
                  onClick={() => toggleArray("timeframes", tf)}
                  className="px-2 py-1 rounded text-xs font-medium transition-all"
                  style={{
                    background: form.timeframes.includes(tf) ? "#2563eb" : "#0f0f1a",
                    color: form.timeframes.includes(tf) ? "white" : "#94a3b8",
                    border: `1px solid ${form.timeframes.includes(tf) ? "#2563eb" : "rgba(100,116,139,0.3)"}`,
                  }}>{tf}</button>
              ))}
            </div>
          </div>

          {/* タグ */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">タグ</label>
            <div className="flex gap-2 mb-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="例：trend（Enterで追加）"
                className="flex-1 px-3 py-1.5 rounded-lg text-sm text-white"
                style={{ background: "#0f0f1a", border: "1px solid rgba(249,115,22,0.3)" }} />
              <button type="button" onClick={addTag}
                className="px-3 py-1.5 rounded-lg text-sm text-white"
                style={{ background: NG }}>追加</button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                  style={{ background: "rgba(249,115,22,0.15)", color: NG }}>
                  #{tag}
                  <button type="button" onClick={() => set("tags", form.tags.filter(t => t !== tag))}
                    className="text-gray-500 hover:text-red-400">✕</button>
                </span>
              ))}
            </div>
          </div>

          {/* 登録方法 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">登録方法</label>
              <select value={form.source_type} onChange={e => set("source_type", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{ background: "#0f0f1a", border: "1px solid rgba(249,115,22,0.3)" }}>
                <option value="MANUAL">手動入力</option>
                <option value="URL">URLから追加</option>
                <option value="AI_GENERATED">AI生成（要確認）</option>
              </select>
            </div>
            {form.source_type === "URL" && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Source URL</label>
                <input value={form.source_url} onChange={e => set("source_url", e.target.value)}
                  type="url" placeholder="https://"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white"
                  style={{ background: "#0f0f1a", border: "1px solid rgba(249,115,22,0.3)" }} />
              </div>
            )}
          </div>

          {/* 編集メモ */}
          {isEdit && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">編集メモ（任意）</label>
              <input value={form.editor_note} onChange={e => set("editor_note", e.target.value)}
                placeholder="変更内容のメモ"
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{ background: "#0f0f1a", border: "1px solid rgba(249,115,22,0.3)" }} />
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 border"
              style={{ borderColor: "rgba(100,116,139,0.3)" }}>キャンセル</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg text-sm text-white font-semibold"
              style={{ background: saving ? "#64748b" : NG }}>
              {saving ? "保存中..." : isEdit ? "更新する" : "作成する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function TradingKnowledgePage() {
  const [items, setItems]       = useState<TradingKnowledge[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<string>("ALL");
  const [modal, setModal]       = useState<"create" | TradingKnowledge | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const url = filter === "ALL" ? "/api/trading-knowledge" : `/api/trading-knowledge?status=${filter}`;
    const res  = await fetch(url);
    const data = await res.json() as { items?: TradingKnowledge[] };
    setItems(data.items ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  async function handleArchive(id: string) {
    if (!confirm("このKnowledgeを無効化しますか？")) return;
    await fetch(`/api/trading-knowledge/${id}`, { method: "DELETE" });
    void load();
  }

  async function handleActivate(id: string, active: boolean) {
    await fetch(`/api/trading-knowledge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: active ? "ACTIVE" : "DRAFT" }),
    });
    void load();
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">AIトレード知識</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            AI Trader が参照する Trading Knowledge を管理します
          </p>
        </div>
        <button
          onClick={() => setModal("create")}
          className="px-4 py-2 rounded-xl text-sm text-white font-semibold"
          style={{ background: NG }}>
          + Knowledge 追加
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {["ALL", "DRAFT", "ACTIVE", "ARCHIVED"].map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: filter === f ? NG : "rgba(249,115,22,0.1)",
              color: filter === f ? "white" : "rgba(255,255,255,0.6)",
            }}>
            {f === "ALL" ? "すべて" : f === "DRAFT" ? "下書き" : f === "ACTIVE" ? "有効" : "無効"}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          {items.length}件
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 rounded-xl"
          style={{ border: "1px dashed rgba(249,115,22,0.2)", color: "rgba(255,255,255,0.3)" }}>
          <p className="text-4xl mb-3">📚</p>
          <p className="text-sm">Knowledge がまだありません</p>
          <p className="text-xs mt-1">「Knowledge 追加」から登録してください</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <div key={item.id} className="rounded-xl p-4"
              style={{ background: "#1a1a2e", border: "1px solid rgba(249,115,22,0.1)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <StatusBadge status={item.status} />
                    <span className="text-[11px] px-2 py-0.5 rounded"
                      style={{ background: "rgba(249,115,22,0.1)", color: NG }}>
                      {item.category}
                    </span>
                    <span className="text-[11px] text-gray-500">v{item.version}</span>
                    {item.market.map(m => (
                      <span key={m} className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(37,99,235,0.2)", color: "#60a5fa" }}>{m}</span>
                    ))}
                  </div>
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  {item.summary && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {item.summary}
                    </p>
                  )}
                  {item.ai_usage && (
                    <p className="text-[11px] mt-1" style={{ color: "#fbbf24" }}>
                      🤖 {item.ai_usage}
                    </p>
                  )}
                  {item.timeframes.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {item.timeframes.map(tf => (
                        <span key={tf} className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(100,116,139,0.2)", color: "#94a3b8" }}>{tf}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.status !== "ARCHIVED" && (
                    <button
                      onClick={() => handleActivate(item.id, item.status !== "ACTIVE")}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: item.status === "ACTIVE" ? "rgba(100,116,139,0.2)" : "rgba(22,163,74,0.2)",
                        color: item.status === "ACTIVE" ? "#94a3b8" : "#4ade80",
                      }}>
                      {item.status === "ACTIVE" ? "下書きに戻す" : "有効化"}
                    </button>
                  )}
                  <button onClick={() => setModal(item)}
                    className="px-2.5 py-1 rounded-lg text-xs text-white transition-all"
                    style={{ background: "rgba(249,115,22,0.2)" }}>編集</button>
                  {item.status !== "ARCHIVED" && (
                    <button onClick={() => handleArchive(item.id)}
                      className="px-2.5 py-1 rounded-lg text-xs transition-all"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>無効化</button>
                  )}
                </div>
              </div>

              {/* Tags */}
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(249,115,22,0.08)", color: "#fb923c" }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
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
