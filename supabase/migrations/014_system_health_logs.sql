-- =================================================================
-- 014_system_health_logs.sql
-- 顧客System稼働ヘルスログ
--
-- 設計原則:
--   - Customer Trading GatewayからのHeartbeatを記録
--   - 生データ（Balance/Equity/Positions）は保存しない
--   - Operationalテレメトリのみ（接続状態・バージョン・Strategy数）
--   - 最新状態はcustomer_systems.last_seen_atで管理
--   - 本テーブルは履歴ログ（90日保持推奨）
-- =================================================================

CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 報告元
  customer_id           UUID          REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_system_id    UUID          REFERENCES public.customer_systems(id) ON DELETE SET NULL,
  system_code           TEXT          NOT NULL,

  -- Gateway稼働状態
  gateway_online        BOOLEAN       NOT NULL DEFAULT true,

  -- MT5接続状態
  mt5_connected         BOOLEAN       NOT NULL DEFAULT false,
  mt5_account_mode      TEXT          CHECK (mt5_account_mode IN ('HEDGING','NETTING')),
  bridge_version        TEXT,

  -- Strategy稼働状況（件数のみ / 詳細はCustomer側に保持）
  active_strategy_count INTEGER       NOT NULL DEFAULT 0,

  -- 追加テレメトリ（任意JSONB）
  metadata              JSONB         NOT NULL DEFAULT '{}',

  reported_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_logs_system_time
  ON public.system_health_logs (customer_system_id, reported_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_health_logs_customer_time
  ON public.system_health_logs (customer_id, reported_at DESC);

ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_health_logs_service_role"
  ON public.system_health_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.system_health_logs IS
  '顧客Trading GatewayからのHeartbeatログ。接続状態・バージョン・Strategy数のみ。'
  '取引詳細（Balance/Equity/Positions）は保存しない。';
