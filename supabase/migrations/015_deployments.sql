-- =================================================================
-- 015_deployments.sql
-- デプロイ履歴管理
--
-- 設計原則:
--   - 顧客Systemへのデプロイ・アップデートを手動記録
--   - Trading View / Gateway / Bridge EA / Supabase の4種別を管理
--   - rollback記録も残す（元バージョンを notes に）
--   - 自動デプロイとの連携は将来対応（C12）
-- =================================================================

CREATE TABLE IF NOT EXISTS public.deployments (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  -- デプロイ先
  customer_id         UUID          NOT NULL
                      REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_system_id  UUID
                      REFERENCES public.customer_systems(id) ON DELETE SET NULL,
  system_code         TEXT,

  -- デプロイ種別
  deploy_type         TEXT          NOT NULL
                      CHECK (deploy_type IN (
                        'TRADING_VIEW',  -- Vercel フロントエンド
                        'GATEWAY',       -- Railway バックエンド
                        'BRIDGE_EA',     -- AVL_FX_Bridge.ex5
                        'SUPABASE',      -- DB マイグレーション
                        'FULL'           -- 全体更新
                      )),

  -- バージョン情報
  version             TEXT,           -- 例: v2.1.0
  bridge_version      TEXT,           -- Bridge EA専用バージョン
  vercel_url          TEXT,           -- デプロイURL（Trading View）

  -- ステータス
  status              TEXT          NOT NULL DEFAULT 'SUCCESS'
                      CHECK (status IN (
                        'SUCCESS',      -- 成功
                        'FAILED',       -- 失敗
                        'ROLLED_BACK',  -- ロールバック済み
                        'IN_PROGRESS'   -- 作業中
                      )),

  -- メモ・変更内容
  notes               TEXT,

  -- 実施者・日時
  deployed_by         TEXT,           -- 実施者（管理者名等）
  deployed_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deployments_customer
  ON public.deployments (customer_id, deployed_at DESC);

CREATE INDEX IF NOT EXISTS idx_deployments_system
  ON public.deployments (customer_system_id, deployed_at DESC);

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deployments_service_role"
  ON public.deployments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.deployments IS
  '顧客Systemへのデプロイ履歴。Trading View / Gateway / Bridge EA / Supabaseの4種別。'
  'rollbackも記録し、変更履歴として保持。';
