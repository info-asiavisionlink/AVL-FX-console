-- =================================================================
-- 012_research_access_log.sql
-- Research APIアクセス監査ログ
--
-- 設計原則:
--   - Research APIへのリクエストを記録
--   - 契約終了後のアクセス試行を検出
--   - Rate limiting基盤
--   - 将来のAudit/Compliance対応
-- =================================================================

CREATE TABLE IF NOT EXISTS public.research_access_log (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  -- アクセス元
  customer_id     UUID          REFERENCES public.customers(id) ON DELETE SET NULL,
  system_code     TEXT,                            -- customer_systems.system_code参照

  -- リクエスト内容
  endpoint        TEXT          NOT NULL,          -- /api/research/bars 等
  request_params  JSONB,                           -- symbol / timeframe / period 等（秘匿情報除く）

  -- アクセス結果
  status          TEXT          NOT NULL
                  CHECK (status IN (
                    'ALLOWED',    -- アクセス許可
                    'DENIED',     -- アクセス拒否（契約終了等）
                    'ERROR'       -- サーバーエラー
                  )),

  denial_reason   TEXT,                            -- DENIEDの場合の理由

  -- パフォーマンス
  duration_ms     INTEGER,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 時系列検索用（最新順）
CREATE INDEX IF NOT EXISTS idx_research_access_log_customer_time
  ON public.research_access_log (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_research_access_log_status_time
  ON public.research_access_log (status, created_at DESC);

-- RLS: service_roleのみ書き込み
ALTER TABLE public.research_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "research_access_log_service_role"
  ON public.research_access_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ログは90日後に自動削除（PostgreSQL pg_cron or application-side cron）
-- 将来: CREATE POLICY ... WITH CHECK (created_at > now() - interval '90 days');

COMMENT ON TABLE public.research_access_log IS
  'Research APIアクセス監査ログ。契約有効期限確認・Rate limiting・Audit用。';

COMMENT ON COLUMN public.research_access_log.status IS
  'ALLOWED=許可 / DENIED=拒否（契約終了・期限切れ等） / ERROR=サーバーエラー';
