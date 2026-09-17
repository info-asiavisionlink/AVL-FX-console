-- =================================================================
-- 008_customer_contracts.sql
-- 顧客契約・請求管理
--
-- 設計原則:
--   - SaaS Subscriptionではなく、カスタム開発契約の手動管理
--   - 金額カラムは存在するが、コードに固定値を持たせない
--   - Research Accessの有効/無効・期限はここで管理
--   - 移管（Transfer）の記録もここで管理
-- =================================================================

CREATE TABLE IF NOT EXISTS public.customer_contracts (
  id                           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  customer_id                  UUID          NOT NULL
                               REFERENCES public.customers(id) ON DELETE CASCADE,

  -- ① 開発・納品
  development_fee              NUMERIC(12,0),                -- 金額（固定値禁止）
  development_payment_status   TEXT          NOT NULL DEFAULT 'PENDING'
                               CHECK (development_payment_status IN (
                                 'PENDING',   -- 未払い
                                 'PARTIAL',   -- 一部入金
                                 'PAID',      -- 入金完了
                                 'CANCELLED'  -- キャンセル
                               )),
  development_paid_at          TIMESTAMPTZ,
  development_invoice_ref      TEXT,                         -- 請求書番号等の参照

  -- ② 月額システム管理
  management_fee               NUMERIC(12,0),                -- 月額（固定値禁止）
  management_status            TEXT          NOT NULL DEFAULT 'INACTIVE'
                               CHECK (management_status IN (
                                 'INACTIVE',  -- 未開始
                                 'ACTIVE',    -- 契約中
                                 'SUSPENDED', -- 一時停止
                                 'ENDED'      -- 終了
                               )),
  management_started_at        TIMESTAMPTZ,
  management_ended_at          TIMESTAMPTZ,
  management_billing_day       INTEGER CHECK (management_billing_day BETWEEN 1 AND 28),

  -- ③ Research Access（別課金）
  research_access_enabled      BOOLEAN       NOT NULL DEFAULT false,
  research_fee                 NUMERIC(12,0),                -- Research月額（固定値禁止）
  research_access_started_at   TIMESTAMPTZ,
  research_access_expires_at   TIMESTAMPTZ,
  research_access_notes        TEXT,

  -- ④ 移管（Transfer）
  transfer_status              TEXT          NOT NULL DEFAULT 'NOT_REQUESTED'
                               CHECK (transfer_status IN (
                                 'NOT_REQUESTED',
                                 'REQUESTED',
                                 'IN_PROGRESS',
                                 'COMPLETED'
                               )),
  transfer_fee                 NUMERIC(12,0),
  transferred_at               TIMESTAMPTZ,
  transfer_notes               TEXT,

  notes                        TEXT,
  created_at                   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 1顧客に1契約（拡張時は複数可）
CREATE INDEX IF NOT EXISTS idx_customer_contracts_customer_id
  ON public.customer_contracts (customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_contracts_research_access
  ON public.customer_contracts (research_access_enabled, research_access_expires_at);

ALTER TABLE public.customer_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_contracts_service_role"
  ON public.customer_contracts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.customer_contracts IS
  '顧客との契約情報。開発費・月額管理費・Research Access・移管を管理。金額は固定値禁止。';

COMMENT ON COLUMN public.customer_contracts.research_access_enabled IS
  'Research Access有効/無効。FALSEの場合、Research APIは利用不可。';

COMMENT ON COLUMN public.customer_contracts.research_access_expires_at IS
  'Research Access期限。NULL = 無期限継続。期限切れ後はAPIがアクセス拒否。';

-- billing_history（請求履歴）—— 将来追加予定
-- CREATE TABLE public.billing_history (...);
