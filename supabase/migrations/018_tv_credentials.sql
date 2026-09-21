-- =================================================================
-- 018_tv_credentials.sql
-- customers テーブルに TV ログインパスワードを保存するカラムを追加
-- Console 管理者が顧客の TV ログイン情報を確認できるようにする
-- =================================================================

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS tv_password TEXT;

COMMENT ON COLUMN public.customers.tv_password IS
  'Trading View ログイン用パスワード（管理者が設定・確認できる）';
