-- =================================================================
-- 010_strategy_versions.sql
-- Strategy Version管理
--
-- 設計原則:
--   - spec_snapshot: バージョン確定時のSpec全体をコピー保存
--   - Import = 特定VersionのSpec Snapshotをコピーして新Strategy作成
--   - Reference方式禁止（元Strategy変更で他Customerに影響しない）
--   - 削除・上書き禁止（履歴は永続保持）
-- =================================================================

CREATE TABLE IF NOT EXISTS public.strategy_versions (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  strategy_id     UUID          NOT NULL
                  REFERENCES public.strategy_registry(id) ON DELETE CASCADE,

  version         INTEGER       NOT NULL CHECK (version >= 1),

  -- このVersionのStrategy定義を完全コピー保存
  spec_snapshot   JSONB         NOT NULL,

  -- 変更メモ
  change_notes    TEXT,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  UNIQUE (strategy_id, version)
);

CREATE INDEX IF NOT EXISTS idx_strategy_versions_strategy_id
  ON public.strategy_versions (strategy_id, version DESC);

ALTER TABLE public.strategy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strategy_versions_service_role"
  ON public.strategy_versions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.strategy_versions IS
  'StrategyのVersion履歴。spec_snapshotにそのVersion時点の定義を完全コピー保存。'
  'Import時はspec_snapshotを新しいStrategy.specにコピーすることで独立性を確保。';
