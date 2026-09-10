# AVLFX Console

AVL-FX Platform Administration Console — 管理者専用

## 概要

このリポジトリはAVLFXプラットフォームの**管理者専用コンソール**です。

- 市場データ (bar_data) の管理・監視
- Console Gateway の状態確認
- Supabase データヘルスチェック
- MT5 DataManager の接続状態確認
- Historical Data の管理

⚠️ **このシステムは一般ユーザー向けではありません。**
トレーディング機能はありません。

---

## システム構成

```
Admin MT5 (AVL_Console_DataManager.mq5)
    ↓ HTTP POST
Console Gateway (gateway/)
    ↓ Supabase UPSERT
Console Supabase (bar_data)
    ↓ Server Component fetch
AVLFX Console (src/)
```

---

## セットアップ

### 1. 依存インストール

```bash
npm install
cd gateway && npm install
```

### 2. 環境変数設定

```bash
cp .env.example .env.local
```

`.env.local` に Console専用Supabaseの値を設定してください。

### 3. Console Gateway起動

```bash
cd gateway
cp ../.env.example .env  # CONSOLE_GATEWAY_SECRET等を設定
npm run dev
```

### 4. Console起動

```bash
npm run dev
# http://localhost:3001 でアクセス
```

---

## 環境変数

`.env.example` を参照してください。

**重要:** Trading ViewのENVとは完全に独立しています。
ConsoleはTrading ViewのSupabaseプロジェクトを参照しません。

---

## MT5 EA

`mt5/AVL_Console_DataManager.mq5`

- データ収集専用
- BUY/SELL/CLOSE等の取引機能は一切ありません
- Admin MT5アカウントで起動してください

---

## Supabase

`supabase/migrations/` に Console専用のマイグレーションが含まれます。

- `001_bar_data.sql` — OHLC Bar データテーブル
- `002_bar_data_rls_open.sql` — RLS設定
- `003_market_data_sync_jobs.sql` — Historical Sync Job管理
- `004_sync_job_recovery.sql` — Sync Job リカバリー

---

## ライセンス

Private — ASIA VISION LINK
