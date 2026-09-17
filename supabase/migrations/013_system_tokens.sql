-- =================================================================
-- 013_system_tokens.sql
-- Research API認証トークン管理
--
-- 設計原則:
--   - Customer Trading ViewがResearch APIを呼ぶためのトークン
--   - Console Supabase Service Role KeyをCustomer側へ渡さない
--   - トークンはCustomer SystemごとまたはCustomerレベルで発行
--   - 失効（revoke）可能
--   - research_access_entitlementはcustomer_contractsで管理（このテーブルはTokenのみ）
-- =================================================================

CREATE TABLE IF NOT EXISTS public.system_tokens (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 発行先
  customer_id           UUID          NOT NULL
                        REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_system_id    UUID
                        REFERENCES public.customer_systems(id) ON DELETE SET NULL,

  -- トークン本体（rtk_プレフィックス + 32文字英数字）
  token                 TEXT          NOT NULL UNIQUE,

  -- 識別名
  token_name            TEXT          NOT NULL,

  -- 有効/無効
  is_active             BOOLEAN       NOT NULL DEFAULT true,

  -- 最終使用
  last_used_at          TIMESTAMPTZ,

  -- メモ
  notes                 TEXT,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_tokens_customer
  ON public.system_tokens (customer_id, is_active);

CREATE INDEX IF NOT EXISTS idx_system_tokens_token
  ON public.system_tokens (token) WHERE is_active = true;

ALTER TABLE public.system_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_tokens_service_role"
  ON public.system_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.system_tokens IS
  'Research API認証トークン。Customer Trading ViewからResearch APIを呼ぶために発行。'
  'Console Supabase Service Role KeyをCustomer側へ渡さないための境界。';

COMMENT ON COLUMN public.system_tokens.token IS
  'rtk_プレフィックス + 32文字英数字。アプリケーション側で生成。'
  'is_active=falseで即時失効。';
