-- =================================================================
-- 017_trading_knowledge.sql
-- AI Trader が参照する Trading Knowledge 管理テーブル
--
-- 設計原則:
--   - KnowledgeはConsole管理データ（Customer Browserから直接アクセス不可）
--   - Historical Market Data とは完全に分離
--   - Version管理: updated_atではなく version カウンタで追跡
--   - Trading View から将来 Knowledge API 経由で参照する構造
--   - status: DRAFT → ACTIVE → ARCHIVED（AIは自動ACTIVE化禁止）
-- =================================================================

CREATE TABLE IF NOT EXISTS public.trading_knowledge (
  id           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 基本情報
  title        TEXT          NOT NULL CHECK (length(title) BETWEEN 2 AND 100),
  category     TEXT          NOT NULL DEFAULT 'General',

  -- 説明（短文）
  summary      TEXT          CHECK (length(summary) <= 500),

  -- 詳細Knowledge本文（長文可）
  content      TEXT          NOT NULL DEFAULT '',

  -- AIへの使用目的
  ai_usage     TEXT          CHECK (length(ai_usage) <= 300),

  -- 対象Market（将来USDJPY等へ拡張可能）
  market       TEXT[]        NOT NULL DEFAULT '{"GOLD"}',

  -- 対象Timeframe（複数選択）
  timeframes   TEXT[]        NOT NULL DEFAULT '{}',

  -- タグ
  tags         TEXT[]        NOT NULL DEFAULT '{}',

  -- 登録方法
  source_type  TEXT          NOT NULL DEFAULT 'MANUAL'
               CHECK (source_type IN ('MANUAL', 'URL', 'AI_GENERATED')),

  source_url   TEXT,

  -- ステータス（AIが自動ACTIVEにしてはいけない）
  status       TEXT          NOT NULL DEFAULT 'DRAFT'
               CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),

  -- バージョン（1から始まる整数カウンタ）
  version      INTEGER       NOT NULL DEFAULT 1 CHECK (version >= 1),

  -- 最終更新者メモ
  editor_note  TEXT,

  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_trading_knowledge_status
  ON public.trading_knowledge (status, category);

CREATE INDEX IF NOT EXISTS idx_trading_knowledge_market
  ON public.trading_knowledge USING GIN (market);

CREATE INDEX IF NOT EXISTS idx_trading_knowledge_tags
  ON public.trading_knowledge USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_trading_knowledge_created
  ON public.trading_knowledge (created_at DESC);

-- RLS: Console service_role のみ CRUD 可（Customer Browser から直接不可）
ALTER TABLE public.trading_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trading_knowledge_service_role"
  ON public.trading_knowledge
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 将来の Knowledge API 用: authenticated も READ 可能にする場合はここで追加

COMMENT ON TABLE public.trading_knowledge IS
  'AI Trader が参照する Trading Knowledge ベース。'
  'Console 管理者のみ作成・編集・削除可能。'
  'Customer Trading View からは将来の Knowledge API 経由で参照する。'
  'Historical Market Data (bar_data) とは完全に別テーブル。';

COMMENT ON COLUMN public.trading_knowledge.version IS
  '編集ごとにインクリメント。AI Trader は使用時の knowledge_id + version を記録し再現性を保つ。';

COMMENT ON COLUMN public.trading_knowledge.status IS
  'DRAFT: 作業中。ACTIVE: AI Trader が参照可能。ARCHIVED: 無効化。'
  'AIが自動的にDRAFT→ACTIVEにすることは禁止。';

COMMENT ON COLUMN public.trading_knowledge.source_type IS
  'MANUAL: 手動入力。URL: URLから取得（管理者確認後にACTIVE化）。AI_GENERATED: AI要約（必ず確認後にACTIVE化）。';

COMMENT ON COLUMN public.trading_knowledge.ai_usage IS
  'このKnowledgeをAI Traderがどのような目的で使用するかの説明。';
