-- =================================================================
-- 009_strategy_registry.sql
-- AVL Master Strategy Registry（Console側）
--
-- ■ Trading View側のstrategy_registryとは別物
--   Trading View Supabase: customer-owned strategy（ユーザーが作成）
--   Console Supabase（このテーブル）: AVL Master Registry（公開ID管理）
--
-- 設計原則:
--   - public_id: 共有・検索用の公開ID（NanoID 21文字）
--   - visibility: PRIVATE / UNLISTED（将来: PUBLIC）
--   - spec: Strategy定義をJSONBで保持
--   - customer_id: 作成元顧客（AVL自身の場合はNULL可）
--   - Secretは保存しない
-- =================================================================

CREATE TABLE IF NOT EXISTS public.strategy_registry (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 共有用公開ID（NanoID 21文字 / 衝突確率 ≈ 1/10^30）
  -- アプリケーション側で生成してINSERT
  public_id           TEXT          NOT NULL UNIQUE
                      CHECK (length(public_id) BETWEEN 16 AND 32),

  -- 基本情報
  name                TEXT          NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  description         TEXT,

  -- GOLD専用
  canonical_symbol    TEXT          NOT NULL DEFAULT 'GOLD',
  timeframes          TEXT[]        NOT NULL DEFAULT '{"H1"}',

  -- Strategy定義（エントリー・エグジット・フィルター・リスク等）
  spec                JSONB         NOT NULL DEFAULT '{}',

  -- 公開設定
  visibility          TEXT          NOT NULL DEFAULT 'PRIVATE'
                      CHECK (visibility IN (
                        'PRIVATE',   -- 作成者のみ
                        'UNLISTED'   -- IDを知る人のみ（将来: PUBLIC）
                      )),

  -- 作成者（AVL自身はNULL許容）
  creator_customer_id UUID          REFERENCES public.customers(id) ON DELETE SET NULL,

  -- ステータス
  status              TEXT          NOT NULL DEFAULT 'DRAFT'
                      CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_registry_public_id
  ON public.strategy_registry (public_id);

CREATE INDEX IF NOT EXISTS idx_strategy_registry_visibility
  ON public.strategy_registry (visibility, status);

CREATE INDEX IF NOT EXISTS idx_strategy_registry_creator
  ON public.strategy_registry (creator_customer_id);

ALTER TABLE public.strategy_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strategy_registry_service_role"
  ON public.strategy_registry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.strategy_registry IS
  'AVL Master Strategy Registry。public_idでCustomer間での共有が可能。'
  'Trading View Supabaseのuser-owned strategyとは独立した管理台帳。';

COMMENT ON COLUMN public.strategy_registry.public_id IS
  'NanoID 21文字の公開共有ID。例: A7K9m2X4p8Q3N6TzWVcBj。'
  'アプリケーション側（nanoid()）で生成してINSERT。DB側で生成しない。';

COMMENT ON COLUMN public.strategy_registry.spec IS
  'Strategy定義JSONB。entry_conditions / exit_conditions / filters / risk 等。'
  'Trading View側のStrategySpec型と互換性を持たせる。';

COMMENT ON COLUMN public.strategy_registry.visibility IS
  'PRIVATE=作成者のみ / UNLISTED=IDを知る人のみ。PUBLICは将来追加予定。';
