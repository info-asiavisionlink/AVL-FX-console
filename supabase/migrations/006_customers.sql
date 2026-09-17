-- =================================================================
-- 006_customers.sql
-- 顧客台帳
--
-- 設計原則:
--   - SaaS User Managementではなく、CUSTOM DEVELOPMENT顧客管理
--   - Supabase auth.usersとは独立（顧客はConsoleにログインしない）
--   - 金額はカラムで管理するが、コードに固定値を持たせない
--   - 個人情報は最小限のみ
-- =================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id                      UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 識別子
  customer_code           TEXT          NOT NULL UNIQUE,   -- AVL-001, AVL-002...
  customer_name           TEXT          NOT NULL,          -- 個人名 or 担当者名
  company_name            TEXT,                            -- 法人の場合
  display_name            TEXT          NOT NULL,          -- UI表示用名称

  -- 連絡先
  email                   TEXT          NOT NULL,

  -- ステータス
  status                  TEXT          NOT NULL DEFAULT 'LEAD'
                          CHECK (status IN (
                            'LEAD',          -- 商談中
                            'DEVELOPMENT',   -- 開発中
                            'TESTING',       -- テスト中
                            'DELIVERED',     -- 納品済み
                            'MAINTENANCE',   -- 月額管理中
                            'SUSPENDED',     -- 一時停止
                            'ENDED'          -- 終了
                          )),

  -- ライフサイクル
  development_started_at  TIMESTAMPTZ,
  delivered_at            TIMESTAMPTZ,
  maintenance_started_at  TIMESTAMPTZ,
  maintenance_ended_at    TIMESTAMPTZ,

  notes                   TEXT,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_status
  ON public.customers (status);

CREATE INDEX IF NOT EXISTS idx_customers_code
  ON public.customers (customer_code);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_service_role"
  ON public.customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.customers IS
  'AVL-FX カスタム開発顧客台帳。一般SaaSユーザーとは別管理。';

COMMENT ON COLUMN public.customers.customer_code IS
  'AVL内部管理コード。例: AVL-001, AVL-002。手動で採番。';

COMMENT ON COLUMN public.customers.status IS
  'LEAD=商談中 / DEVELOPMENT=開発中 / TESTING=テスト中 / DELIVERED=納品済 / MAINTENANCE=管理中 / SUSPENDED=停止 / ENDED=終了';

-- Customer 001: AVL自身（内部検証用）
INSERT INTO public.customers (
  customer_code, customer_name, company_name, display_name, email, status
) VALUES (
  'AVL-001', 'AVL Internal', 'ASIA VISION LINK', 'AVL自社検証', 'info@asiavision.link', 'MAINTENANCE'
) ON CONFLICT (customer_code) DO NOTHING;
