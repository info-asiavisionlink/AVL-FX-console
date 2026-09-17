-- =================================================================
-- 011_strategy_shares.sql
-- Strategy共有・Import記録
--
-- 設計原則:
--   - Import = 特定VersionのSpec Snapshotを新Strategyとしてコピー作成
--   - 元Strategyへの依存関係なし（Reference不可）
--   - 共有禁止情報: MT5 account / positions / deals / secrets
--   - 共有するのはStrategy定義（spec）のみ
-- =================================================================

CREATE TABLE IF NOT EXISTS public.strategy_shares (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 共有元
  source_strategy_id    UUID          NOT NULL
                        REFERENCES public.strategy_registry(id) ON DELETE CASCADE,
  source_version        INTEGER       NOT NULL,

  -- 受け取り顧客（Import先）
  target_customer_id    UUID          NOT NULL
                        REFERENCES public.customers(id) ON DELETE CASCADE,

  -- Import後に作成された新Strategy（コピー）
  target_strategy_id    UUID          REFERENCES public.strategy_registry(id) ON DELETE SET NULL,

  -- Import時に使用したSpec Snapshot（独立性確保のため記録）
  imported_spec         JSONB,

  imported_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_shares_source
  ON public.strategy_shares (source_strategy_id, source_version);

CREATE INDEX IF NOT EXISTS idx_strategy_shares_target
  ON public.strategy_shares (target_customer_id);

ALTER TABLE public.strategy_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strategy_shares_service_role"
  ON public.strategy_shares
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.strategy_shares IS
  'Strategy共有・Import履歴。ImportはSpec Snapshotのコピーで独立。'
  '元Strategyが変更されても、Import済みのStrategyには影響しない。';
