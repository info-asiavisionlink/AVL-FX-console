-- =================================================================
-- 016_console_audit_log.sql
-- Console管理操作ログ
--
-- 設計原則:
--   - Console管理者の操作を記録（顧客作成・契約変更・トークン発行等）
--   - 操作内容のみ記録（機密情報は記録しない）
--   - 改ざん防止: INSERT のみ許可（UPDATE/DELETE 禁止）
-- =================================================================

CREATE TABLE IF NOT EXISTS public.console_audit_log (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 操作者
  admin_email   TEXT          NOT NULL,

  -- 操作種別
  action        TEXT          NOT NULL,   -- 例: CREATE_CUSTOMER, UPDATE_CONTRACT, ISSUE_TOKEN

  -- 対象リソース
  resource_type TEXT,                     -- customers / customer_systems / deployments 等
  resource_id   TEXT,                     -- UUID文字列

  -- 変更内容（要約）
  summary       TEXT,
  metadata      JSONB         NOT NULL DEFAULT '{}',

  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_console_audit_log_admin
  ON public.console_audit_log (admin_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_console_audit_log_resource
  ON public.console_audit_log (resource_type, resource_id, created_at DESC);

ALTER TABLE public.console_audit_log ENABLE ROW LEVEL SECURITY;

-- INSERT のみ許可
CREATE POLICY "console_audit_log_insert"
  ON public.console_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "console_audit_log_select"
  ON public.console_audit_log
  FOR SELECT
  TO service_role
  USING (true);

COMMENT ON TABLE public.console_audit_log IS
  'Console管理者の操作ログ。顧客作成・契約変更・トークン発行等を記録。'
  'INSERT のみ許可（改ざん防止）。';
