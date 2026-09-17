-- =================================================================
-- 005_gold_data_config.sql
-- GOLD データ収集設定テーブル
--
-- 設計原則:
--   - GOLD専用スコープ
--   - broker_symbol（実Brokerシンボル）と canonical_symbol（内部統一名）を分離
--   - 例: broker_symbol=GOLD# → canonical_symbol=GOLD
--   - 収集する時間足（timeframes）をテーブルで管理
-- =================================================================

CREATE TABLE IF NOT EXISTS public.gold_data_config (
  id               UUID          DEFAULT gen_random_uuid() PRIMARY KEY,

  canonical_symbol TEXT          NOT NULL DEFAULT 'GOLD',
  broker_symbol    TEXT          NOT NULL,       -- MT5から受信する実シンボル名 (GOLD#, XAUUSD等)

  enabled          BOOLEAN       NOT NULL DEFAULT true,
  timeframes       TEXT[]        NOT NULL DEFAULT '{"M5","H1","H4","D1"}',

  -- 収集状況（Gateway/Sync後に更新）
  last_tick_at     TIMESTAMPTZ,
  last_bar_at      TIMESTAMPTZ,
  last_sync_at     TIMESTAMPTZ,
  stored_bars      INTEGER       DEFAULT 0,
  earliest_bar_at  TIMESTAMPTZ,
  latest_bar_at    TIMESTAMPTZ,

  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- broker_symbolはユニーク（同一Brokerシンボルを重複登録しない）
CREATE UNIQUE INDEX IF NOT EXISTS idx_gold_data_config_broker_symbol
  ON public.gold_data_config (broker_symbol);

-- RLS: service_roleのみ書き込み / 読み取りはAdmin Console経由
ALTER TABLE public.gold_data_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gold_data_config_service_role"
  ON public.gold_data_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.gold_data_config IS
  'GOLD市場データ収集設定。broker_symbol（実Broker名）とcanonical_symbol（内部統一名）を管理。';

COMMENT ON COLUMN public.gold_data_config.broker_symbol IS
  'MT5から受信するBrokerごとのシンボル名。GOLD#, XAUUSD, GOLD等。';

COMMENT ON COLUMN public.gold_data_config.canonical_symbol IS
  '内部統一シンボル名。原則GOLD。bar_dataのsymbol列と一致させる。';

-- 初期データ（GOLDのデフォルト設定）
INSERT INTO public.gold_data_config (canonical_symbol, broker_symbol, enabled, timeframes)
VALUES ('GOLD', 'GOLD', true, '{"M1","M5","M15","M30","H1","H4","D1"}')
ON CONFLICT (broker_symbol) DO NOTHING;
