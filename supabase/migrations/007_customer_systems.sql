-- =================================================================
-- 007_customer_systems.sql
-- 顧客専用Systemのオペレーショナルメタデータ
--
-- 設計原則:
--   - Secret保存禁止（Service Role Key, Railway Secret, API Key等）
--   - 保存するのはProject名・URL・バージョン等のメタデータのみ
--   - 1顧客が複数Systemを持てる（将来拡張対応）
-- =================================================================

CREATE TABLE IF NOT EXISTS public.customer_systems (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  customer_id           UUID          NOT NULL
                        REFERENCES public.customers(id) ON DELETE CASCADE,

  system_code           TEXT          NOT NULL UNIQUE,   -- SYS-001-01 等
  system_name           TEXT          NOT NULL,

  -- バージョン管理
  version               TEXT,                            -- 例: 1.0.0
  bridge_version        TEXT,                            -- AVL_FX_Bridge バージョン

  -- 外部サービス参照（Project名・URLのみ / Secretは保存しない）
  production_url        TEXT,                            -- Trading View本番URL
  github_repository     TEXT,                            -- owner/repo形式
  vercel_project_name   TEXT,                            -- Vercel Project名
  railway_project_name  TEXT,                            -- Railway Project名
  supabase_project_name TEXT,                            -- Supabase Project名（URLだけでも可）

  -- 稼働状態
  system_status         TEXT          NOT NULL DEFAULT 'BUILDING'
                        CHECK (system_status IN (
                          'BUILDING',      -- 構築中
                          'TESTING',       -- テスト中
                          'LIVE',          -- 本番稼働中
                          'SUSPENDED',     -- 停止中
                          'TRANSFERRED'    -- 移管済み
                        )),

  -- 稼働確認
  last_deployed_at      TIMESTAMPTZ,
  last_seen_at          TIMESTAMPTZ,

  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_systems_customer_id
  ON public.customer_systems (customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_systems_status
  ON public.customer_systems (system_status);

ALTER TABLE public.customer_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_systems_service_role"
  ON public.customer_systems
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.customer_systems IS
  '顧客専用Systemのメタデータ台帳。Secret（Service Role / APIキー等）は保存しない。';

COMMENT ON COLUMN public.customer_systems.github_repository IS
  'owner/repo形式で保存。例: info-asiavisionlink/avl-customer-001';

COMMENT ON COLUMN public.customer_systems.bridge_version IS
  '顧客に提供したAVL_FX_Bridge.ex5のバージョン。コンパイル済みバイナリを提供。';

-- Customer 001のSystem（AVL自社検証用）
-- customer_idは後からUPDATEで設定（customers.id確定後）
