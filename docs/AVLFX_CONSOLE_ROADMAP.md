# AVLFX Console — 完全版ロードマップ
## GOLD Specialized System / Custom Development Platform
### 最終更新: 2026-09

---

## 0. 前提・製品方針

### 事業モデル
AVL-FXは一般向けSaaSではなく、以下を組み合わせたカスタム開発ビジネスです。

- **CUSTOM DEVELOPMENT** — 顧客ごと専用Systemを開発
- **SYSTEM SALE** — 開発済みSystemの納品
- **MONTHLY SYSTEM MANAGEMENT** — 月額システム管理
- **AVL RESEARCH DATA ACCESS** — 月額Historical Data研究アクセス

### 製品スコープ
**当面はGOLD専用** Trading Systemに特化します。
複数通貨ペア対応は本Roadmapの完成条件ではありません。

### 顧客構成（例）
```
Customer A
├── 専用 Trading View（Vercel）
├── 専用 GitHub
├── 専用 Railway（Trading Gateway）
├── 専用 Supabase（Trading DB）
├── Customer MT5
└── AVL_FX_Bridge.ex5（共通バイナリ）

Customer B
├── 専用 Trading View（Vercel）
└── ...（同構成）
```

### 責任境界
| リソース | 所有者 |
|---|---|
| Console / Console Supabase / Console Gateway | AVL |
| Trading View Template / Bridge EA binary | AVL（ベース） |
| 顧客専用 Trading View / Supabase / Railway | Customer側に独立 |
| GOLD Historical Data | AVL |
| Research API | AVL |

---

## 1. システム分離状態（確認済み）

### DONE: Console / Trading View 完全分離

| 項目 | Console | Trading View |
|---|---|---|
| URL | avl-fx-console.vercel.app | 顧客ごと個別 |
| GitHub | info-asiavisionlink/AVL-FX-console | 顧客ごと個別 |
| Vercel Project | avl-fx-console | 顧客ごと個別 |
| Railway | avl-fx-console-production | remarkable-cooperation |
| Supabase | ghufhqodgrkftmhjozhj | bsmofroshpmomjwfxigh |
| package.json | 独立 | 独立 |
| ENV | 独立 | 独立 |
| MT5 EA | AVL_Console_DataManager | AVL_FX_Bridge |

**この分離を絶対に元に戻してはいけない。**

---

## 2. 現状監査結果（コードベース確認済み）

### ✅ DONE — Console（実装完了）

#### インフラ
- Console Next.js App（Vercel）
- Console Gateway（Railway / Express + WebSocket + TypeScript）
- Console Supabase（独立プロジェクト）
- 管理者ログイン（ADMIN_EMAILS allowlist）
- Supabase Auth + email/password

#### UI（6ページ）
- `/dashboard` — Gateway + Supabase ヘルスサマリー
- `/market-data` — リアルタイム価格 + **手動差分同期ボタン**
- `/historical` — bar_data 統計（シンボル×TF別バー数・期間）
- `/mt5` — MT5 DataManager 接続状態
- `/gateway` — Console Gateway エンドポイント一覧
- `/system` — データパイプライン疎通確認

#### デザイン
- White × Orange（グラデーションサイドバー）

#### データ
- Console Supabase migrations:
  - `001_bar_data.sql` — OHLCVテーブル・PK(symbol,timeframe,time_utc)
  - `002_bar_data_rls_open.sql` — RLS設定
  - `003_market_data_sync_jobs.sql` — Sync Jobテーブル
  - `004_sync_job_recovery.sql` — stale job回収RPC
- bar_data 約**203万本**移管済み（Trading View Supabaseから）
- get_bar_data_status() RPC実装済み
- get_bar_stats() RPC実装済み

#### Gateway
- `barDataStore.ts` — 自動同期OFF・差分同期（upsertIncrementalBars）
- `syncJobStore.ts` — Sync Job管理
- `/admin/sync-to-supabase` — 差分同期エンドポイント
- ブローカーsuffix正規化: `GOLD#` → `GOLD`（normalizeSymbol）

#### MT5 EA
- `AVL_Console_DataManager.mq5`（v1.00）
- コンパイル済み（`.ex5`）
- MT5 Expertsフォルダ配置済み
- **BUY/SELL/CLOSE/MODIFY完全除去済み**（OrderStream_Poll削除確認）
- デフォルト接続先: Console Gateway Railway URL

#### 手動同期
- `src/components/SyncButton.tsx` — Client Component
- `src/app/api/sync/route.ts` — 同期APIルート
- 差分同期: Supabase最新time_utcより新しいバーのみ追加

---

### ❌ NOT IMPLEMENTED — Console（未実装）

#### DB（テーブル未作成）
- `customers`
- `customer_systems`
- `customer_contracts`
- `billing_history`
- `research_access`
- `strategy_registry`（Console側。Trading View側は別Supabaseに存在）
- `strategy_versions`（Console側）
- `strategy_shares`
- `system_health_logs`
- `deployments`
- `gold_data_config`

#### API（未作成）
- Customer CRUD API
- Customer System CRUD API
- Contract API
- Research Access API
- Strategy Registry API
- Public Strategy ID生成
- Strategy Share API
- Research API（Historical Data提供）
- System Monitoring API
- Deployment API

#### UI（未作成）
- 顧客一覧・登録・詳細
- 顧客システム管理
- 契約・請求管理
- Research Access管理
- Strategy Registry UI
- GOLD Data Configuration
- システム稼働監視ダッシュボード
- デプロイ履歴

---

### ✅ DONE — Trading View（実装確認済み）

#### DB Schema（Trading View Supabase）
- `strategy_registry` — Magic Number・Entry/Exit/Filter条件 JSONB
- `strategy_versions` — バージョン履歴スナップショット
- `strategy_signals` — Signal → Command 分離（BUY/SELL/EXIT/SKIP）
- `strategy_runtime_state` — STOPPED/RUNNING/ERROR リアルタイム状態
- `execution_commands` — command_id UNIQUE・strategy_id・magic_number・position_ticket・deal_ticket 全フィールド実装
- `mt5_connections` — **account_mode: HEDGING/NETTING 区別あり**
- `live_positions` — strategy_id + magic_number で追跡
- `live_deals` — command_id で追跡
- `backtest_jobs` / `backtest_results`
- `user_subscriptions`（Stripe SaaS — 削除予定）
- `cot_positions`

#### Backtest Engine（Trading View側 src/infrastructure/backtest/）
- `BacktestEngine.ts` — メインエンジン
- `evaluator.ts` — Strategy条件評価（Pure Function、Supabase非依存）
- `WalkForwardEngine.ts` — Walk Forward検証
- `MonteCarloEngine.ts` — Monte Carlo
- `OptimizationEngine.ts` — パラメータ最適化
- `BacktestService.ts` — **現状: Supabase bar_data直接参照**
- `BacktestAnalyzer.ts`、`BacktestReporter.ts` — 統計分析・レポート

**現状の問題**: BacktestService.tsがbar_dataをSupabase直接参照。
Research API移行が必要。

#### News / Economic Calendar
- `/api/news/route.ts` — 実装済み
- `/api/economic-calendar/route.ts` — 実装済み

#### SaaS（削除予定）
- `user_subscriptions` テーブル
- `/api/stripe/` 各ルート
- 料金プランUI（pricing/page.tsx）

#### JARVIS系（削除予定）
- `src/presentation/components/os/` 各コンポーネント（DashboardOS等）
- useRealtimeAgent.ts（Voice）
- Three.js、GSAP依存

---

### 📊 Hedging/Netting 現状

```
mt5_connections.account_mode: TEXT ('HEDGING' | 'NETTING')
デフォルト: HEDGING
```

- **Bridge側**: heartbeat時にaccount_type・account_modeをSupabaseへ更新済み
- **Hedging**: 同シンボルで複数Strategy（BUY + SELL）を同時に持てる
- **Netting**: 同シンボルのポジションは相殺される（複数Strategy混在で意図せずポジション消去の危険）
- **現状**: HEDGINGアカウントを前提に設計。Nettingは制約明記が必要

---

### 📊 Magic Number / Strategy追跡 現状

Trading View側スキーマで既に実装済み:
```
execution_commands:
  strategy_id → magic_number → command_id
  → broker_order_ticket → broker_position_ticket → broker_deal_ticket

live_positions:
  strategy_id + magic_number で追跡可

live_deals:
  command_id で追跡可
```

**問題点**: `public_strategy_id`（共有用）未実装。`strategy_registry`に該当フィールドなし。

---

### 📊 Backtest実行場所 現状 vs Target

| | 現状 | Target |
|---|---|---|
| 実行場所 | Customer Trading View Server | AVL Research Server |
| データ取得 | Supabase bar_data直接（Admin key） | Research API経由 |
| 方式 | OPTION A | **OPTION B推奨** |
| 問題 | AVL Historical Dataが直接露出 | データ保護・契約切断対応 |

---

## 3. GOLD Symbol管理設計

### Canonical Symbol
内部管理シンボルは `GOLD` に統一。

### Broker Symbol
実Brokerから受け取るシンボル（`GOLD#`、`XAUUSD`等）は別情報として保持。

### Normalization（実装済み）
```typescript
// gateway/src/barDataStore.ts
function normalizeSymbol(symbol: string): string {
  return symbol.replace(/[#.].*$/, "").toUpperCase();
  // GOLD# → GOLD, XAUUSD.a → XAUUSD
}
```

### gold_data_config テーブル（未実装）
```sql
CREATE TABLE gold_data_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_symbol TEXT NOT NULL DEFAULT 'GOLD',
  broker_symbol   TEXT NOT NULL,             -- 実Broker symbol
  enabled         BOOLEAN NOT NULL DEFAULT true,
  timeframes      TEXT[] NOT NULL DEFAULT '{"M5","H1","H4","D1"}',
  last_tick_at    TIMESTAMPTZ,
  last_bar_at     TIMESTAMPTZ,
  last_sync_at    TIMESTAMPTZ,
  stored_bars     INTEGER DEFAULT 0,
  earliest_bar_at TIMESTAMPTZ,
  latest_bar_at   TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Console Database 設計（未実装テーブル）

### customers
```sql
CREATE TABLE customers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code           TEXT NOT NULL UNIQUE,   -- AVL-001, AVL-002...
  customer_name           TEXT NOT NULL,
  company_name            TEXT,
  display_name            TEXT NOT NULL,
  email                   TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'LEAD'
                          CHECK (status IN (
                            'LEAD','DEVELOPMENT','TESTING',
                            'DELIVERED','MAINTENANCE','SUSPENDED','ENDED'
                          )),
  development_started_at  TIMESTAMPTZ,
  delivered_at            TIMESTAMPTZ,
  maintenance_started_at  TIMESTAMPTZ,
  maintenance_ended_at    TIMESTAMPTZ,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### customer_systems
```sql
CREATE TABLE customer_systems (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID NOT NULL REFERENCES customers(id),
  system_code         TEXT NOT NULL UNIQUE,
  system_name         TEXT NOT NULL,
  version             TEXT,
  production_url      TEXT,
  github_repository   TEXT,       -- owner/repo 形式
  vercel_project_name TEXT,       -- Project名のみ（Secretは保存しない）
  railway_project_name TEXT,
  supabase_project_name TEXT,     -- Project名のみ（Service Roleは保存しない）
  bridge_version      TEXT,       -- AVL_FX_Bridge バージョン
  system_status       TEXT NOT NULL DEFAULT 'BUILDING'
                      CHECK (system_status IN (
                        'BUILDING','TESTING','LIVE','SUSPENDED','TRANSFERRED'
                      )),
  last_deployed_at    TIMESTAMPTZ,
  last_seen_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 保存禁止: Supabase service role, Railway secret, broker password, OpenAI key
```

### customer_contracts
```sql
CREATE TABLE customer_contracts (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id                 UUID NOT NULL REFERENCES customers(id),
  -- 開発・納品
  development_fee             NUMERIC,            -- 固定値禁止
  development_payment_status  TEXT DEFAULT 'PENDING'
                              CHECK (development_payment_status IN (
                                'PENDING','PARTIAL','PAID','CANCELLED'
                              )),
  development_paid_at         TIMESTAMPTZ,
  -- 月額管理
  management_fee              NUMERIC,            -- 固定値禁止
  management_status           TEXT DEFAULT 'INACTIVE'
                              CHECK (management_status IN (
                                'INACTIVE','ACTIVE','SUSPENDED','ENDED'
                              )),
  management_started_at       TIMESTAMPTZ,
  management_ended_at         TIMESTAMPTZ,
  -- Research Access（別課金）
  research_access_enabled     BOOLEAN NOT NULL DEFAULT false,
  research_access_started_at  TIMESTAMPTZ,
  research_access_expires_at  TIMESTAMPTZ,
  -- 移管
  transfer_status             TEXT DEFAULT 'NOT_REQUESTED'
                              CHECK (transfer_status IN (
                                'NOT_REQUESTED','REQUESTED','IN_PROGRESS','COMPLETED'
                              )),
  transferred_at              TIMESTAMPTZ,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### strategy_registry（Console側 — Trading View側とは別）
```sql
-- Console側はAVL Master Strategy Registryとして管理
-- Trading View側のuser-owned strategyとは別物
CREATE TABLE strategy_registry (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 共有用Public ID（16桁英数字 / ULID等で衝突確率を評価）
  public_id         TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  -- GOLD専用前提
  canonical_symbol  TEXT NOT NULL DEFAULT 'GOLD',
  timeframes        TEXT[] NOT NULL,
  -- Strategy定義（JSONB）
  spec              JSONB NOT NULL,
  -- 共有設定
  visibility        TEXT NOT NULL DEFAULT 'PRIVATE'
                    CHECK (visibility IN ('PRIVATE','UNLISTED')),
  -- 作成者（Customer or AVL内部）
  creator_customer_id UUID REFERENCES customers(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Public Strategy ID 設計
- 形式候補: **ULID** (26文字) または **NanoID** (21文字英数字)
- 例: `01HZXK9M2X4P8Q3N6TZ7WA5BVC`（ULID）
- 衝突確率: NanoID 21文字 = 10^30分の1（実用上ゼロ）
- 16桁英数字はエントロピー不足の可能性（62^16 ≈ 4.7×10^28）→ NanoID推奨

### strategy_versions（Console側）
```sql
CREATE TABLE strategy_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id     UUID NOT NULL REFERENCES strategy_registry(id),
  version         INTEGER NOT NULL,
  spec_snapshot   JSONB NOT NULL,   -- Version確定時のSpecをコピー保存
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(strategy_id, version)
);
-- 共有はReference不可。Import = 特定Versionのspec_snapshotをコピー
```

### strategy_shares（顧客間共有）
```sql
CREATE TABLE strategy_shares (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_strategy_id  UUID NOT NULL REFERENCES strategy_registry(id),
  source_version      INTEGER NOT NULL,
  -- 受け取った顧客側で新規strategyを作成（Copyとして独立）
  target_customer_id  UUID NOT NULL REFERENCES customers(id),
  target_strategy_id  UUID REFERENCES strategy_registry(id),  -- コピー後に設定
  imported_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 共有禁止: MT5 account, positions, deals, customer identity, secrets
```

---

## 5. Research Access 設計

### 契約中に利用可能
- GOLD Historical Data閲覧
- Historical Backtest実行
- AI Backtest Analysis
- Strategy Validation
- Research API呼び出し

### 契約終了後もCustomer側でKEEP
- Trading View（Vercel）
- MT5接続・リアルタイム価格
- GOLDチャート・Market・Positions
- Trade History（顧客データ）
- 既存Strategy（定義・MagicNumber）
- 既存EA実行

### 契約終了後に利用不可
- AVL Historical Dataset
- Historical Backtest
- Research API
- Research依存のStrategy Validation

**設計原則**: システム全体をロックしない。AVL所有のResearch Serviceのみ停止。

---

## 6. Research API アーキテクチャ決定

### 現状（OPTION A 問題点）
```
Customer Trading View Server
→ Supabase bar_data 直接参照（Admin key使用）
```
問題: AVL Historical DataがCustomer側に直接露出。契約終了時の切断が困難。

### Target（OPTION B 採用）
```
Customer Trading View
→ Research API（JWT認証 + research_access_entitlement確認）
→ AVL Historical GOLD Data
→ Backtest実行（AVL Server側）
→ Result（Bar生データ非露出）のみ返却
```

### Research API セキュリティ要件
- Console Supabase Service Role KeyをCustomer側へ**絶対に渡さない**
- ブラウザから Console Supabase への直接アクセス禁止
- 認証: Customer/System識別 + Research Access期限確認
- Rate limiting（将来）
- Audit log
- 有効期限・失効対応

---

## 7. Backtest実行場所（OPTION B推奨の詳細比較）

| 観点 | OPTION A（Customer側） | OPTION B（AVL Server） |
|---|---|---|
| Historical Data保護 | ❌ Customer側に露出 | ✅ AVL内で完結 |
| AVL IP保護 | ❌ Barデータが流出 | ✅ 結果のみ返却 |
| 契約終了対応 | ❌ 切断困難 | ✅ API停止で即切断 |
| セキュリティ | ❌ Admin keyの流出リスク | ✅ サーバー間通信 |
| 実装複雑度 | ✅ 低い（現状） | ❌ 高い（API新設） |
| パフォーマンス | ✅ Customer側で完結 | △ ネットワーク往復 |
| スケーラビリティ | ❌ 各Customerが個別実行 | ✅ AVL側で集中管理 |
| 移行コスト | — | △ BacktestService要修正 |

**決定: OPTION B**を採用。BacktestServiceをResearch API経由に段階的に移行。

---

## 8. Stage別ロードマップ

---

### ✅ STAGE C0 — 完了（Current State / GOLD Scope Lock）

**STATUS: DONE**

完成済み一覧:
- Console / Trading View 完全分離
- Console 独立 Vercel / GitHub / Railway / Supabase
- Admin Login
- 6ページUI（Dashboard / Market Data / Historical / MT5 / Gateway / System）
- White × Orange デザイン
- Console Gateway（Railway）
- AVL_Console_DataManager.mq5（データ収集専用）
- 手動差分同期（SyncButton）
- GOLD# → GOLD 正規化
- 約203万本のbar_data移管

---

### 🚧 STAGE C1 — Console Database Foundation

**PURPOSE**: Console Supabaseに全基盤テーブルを作成する。後から作り直さなくて済む順序を最優先。

**CURRENT STATUS**: `bar_data`と`sync_jobs`のみ存在。他テーブル未作成。

**FILES**
```
supabase/migrations/
  005_gold_data_config.sql
  006_customers.sql
  007_customer_systems.sql
  008_customer_contracts.sql
  009_strategy_registry.sql   ← Console側Master Registry
  010_strategy_versions.sql
  011_strategy_shares.sql
  012_research_access_log.sql
```

**DATABASE**
- `gold_data_config`
- `customers`（status ENUM含む）
- `customer_systems`（Secret保存禁止）
- `customer_contracts`（research_access含む）
- `strategy_registry`（public_id / visibility / spec JSONB）
- `strategy_versions`（spec_snapshotコピー方式）
- `strategy_shares`（コピーImport方式）
- `research_access_log`（アクセス監査）

**API**: なし（このStageはDB基盤のみ）

**UI**: なし（このStageはDB基盤のみ）

**SECURITY**
- Service Role のみ書き込み可
- Admin Email認証でConsoleアクセスを制限（現行維持）

**DEFINITION OF DONE**
- [ ] 全テーブルがConsole Supabaseに作成済み
- [ ] Migration filesがGitHubにpush済み
- [ ] 既存bar_data、sync_jobsテーブルへの影響なし
- [ ] RLS設定済み（Admin=service role only write）

**DO NOT DO**
- Production DBへのmigration実行前に確認なし
- Trading View Supabaseへの変更
- 既存テーブルの変更

---

### 🚧 STAGE C2 — GOLD Data Configuration UI

**PURPOSE**: GOLDデータ収集設定・状態をConsoleから確認・管理できるようにする。

**CURRENT STATUS**: bar_data統計表示のみ。設定UIなし。

**FILES**
```
src/app/(admin)/gold-data/page.tsx     ← 新規ページ
src/app/(admin)/gold-data/             ← 設定UI
src/app/api/gold-config/route.ts       ← 設定CRUD
```

**DATABASE**: `gold_data_config`テーブル（C1で作成）

**UI**
- GOLDデータ設定一覧（broker_symbol / canonical_symbol / enabled / timeframes）
- 最終Tick受信時刻・最終Bar時刻・最終Sync時刻
- 蓄積Bar数・期間（最古〜最新）
- データヘルス表示

**DEFINITION OF DONE**
- [ ] gold_data_config CRUD UI
- [ ] Dashboard にGOLDデータ状態サマリーを追加
- [ ] 現行のbar_data統計（historical page）との重複を整理

**DO NOT DO**
- multi-symbol management（GOLD以外を前提にしない）
- Trading View側のUI変更

---

### 🚧 STAGE C3 — Customer Registry

**PURPOSE**: 顧客の基本情報・ステータスをConsoleで管理する。

**CURRENT STATUS**: 未実装。

**FILES**
```
src/app/(admin)/customers/page.tsx         ← 顧客一覧
src/app/(admin)/customers/new/page.tsx     ← 新規登録
src/app/(admin)/customers/[id]/page.tsx    ← 顧客詳細
src/app/api/customers/route.ts
src/app/api/customers/[id]/route.ts
```

**DATABASE**: `customers`テーブル（C1で作成）

**UI（日本語）**
- 顧客一覧（コード / 名前 / 状態 / 開発開始日 / 納品日）
- 新規登録フォーム
- ステータス変更（リード / 開発中 / テスト中 / 納品済 / 管理中 / 停止 / 終了）
- 詳細ページ

**SECURITY**
- Admin認証済みのみアクセス可
- Customer個人情報は最小限のみ保存

**DEFINITION OF DONE**
- [ ] 顧客CRUD完了
- [ ] ステータス管理動作確認
- [ ] Customer 001（AVL自身）をシステムに登録

**DO NOT DO**
- Stripe連携
- Public Signup
- SaaS User Managementとの混同

---

### 🚧 STAGE C4 — Customer System Registry

**PURPOSE**: 各顧客の専用Systemのメタデータ（URL・GitHub・Vercel等）をConsoleで管理する。

**CURRENT STATUS**: 未実装。

**FILES**
```
src/app/(admin)/customers/[id]/systems/page.tsx
src/app/(admin)/customers/[id]/systems/new/page.tsx
src/app/api/customers/[id]/systems/route.ts
```

**DATABASE**: `customer_systems`テーブル（C1で作成）

**UI**
- システム一覧（URL / GitHub / Vercel / Railway / Bridge Version / 状態）
- 登録・編集フォーム
- 最終デプロイ日時・最終稼働確認日時

**SECURITY**
- **Secret保存禁止**: Service Role Key・Railway Secret・MT5パスワード・APIキー
- 保存するのはProject名・URL・バージョン等のメタデータのみ

**DEFINITION OF DONE**
- [ ] Customer 001のSystem情報登録完了
- [ ] Secret非保存の設計確認

---

### 🚧 STAGE C5 — Contract / Management / Research Access

**PURPOSE**: 開発費・月額管理費・Research Access契約をConsoleで管理する。

**CURRENT STATUS**: 未実装。

**FILES**
```
src/app/(admin)/customers/[id]/contract/page.tsx
src/app/api/customers/[id]/contract/route.ts
```

**DATABASE**: `customer_contracts`テーブル（C1で作成）

**UI**
- 開発費・支払い状態
- 月額管理契約（開始・終了日・状態）
- Research Access（有効/無効・期限）
- 移管状態

**DEFINITION OF DONE**
- [ ] Customer 001のContract登録
- [ ] Research Access ON/OFFの切り替えUI

**DO NOT DO**
- Stripe連携（このStageでは手動管理）
- 料金をコードに固定

---

### 🚧 STAGE C6 — Strategy Registry（Console Master）

**PURPOSE**: AVLが管理するStrategy Registry（Public IDを持つ）をConsoleに実装する。

**CURRENT STATUS**: Trading View Supabaseにuser-owned strategy_registryは存在するが、Console側・Public IDは未実装。

**FILES**
```
src/app/(admin)/strategies/page.tsx
src/app/(admin)/strategies/[id]/page.tsx
src/app/api/strategies/route.ts
src/app/api/strategies/[id]/route.ts
src/lib/public-id.ts   ← NanoID生成
```

**DATABASE**: `strategy_registry`・`strategy_versions`・`strategy_shares`（C1で作成）

**UI**
- Strategy一覧（Public ID / 名前 / シンボル / 公開設定 / バージョン）
- Strategy詳細・バージョン履歴
- 公開設定（PRIVATE / UNLISTED）
- 共有履歴

**Public Strategy ID**
```typescript
import { nanoid } from 'nanoid';
// 21文字英数字。衝突確率 ≈ 1/10^30
export function generatePublicStrategyId(): string {
  return nanoid(21);
}
```

**Strategy共有フロー**
```
Customer A が Strategy を UNLISTED に設定
→ Public IDを知るCustomer Bが import リクエスト
→ 特定Versionのspec_snapshotをコピーして Customer B の新Strategy作成
→ 新しいstrategy_id + 新しいMagic Numberを発行
→ Customer Aのoriginal Strategyへの参照は持たない
```

**DEFINITION OF DONE**
- [ ] Public ID生成・重複チェック
- [ ] Version管理（spec_snapshotコピー方式）
- [ ] PRIVATE / UNLISTED設定
- [ ] Import時のコピー独立確認

---

### 🚧 STAGE C7 — Research API（境界設計）

**PURPOSE**: AVL Historical DataへのアクセスをAPI経由に限定し、Customer Supabaseからの直接参照を廃止するための境界を設計・実装する。

**CURRENT STATUS**: Trading View BacktestServiceがConsole SupabaseのBar_dataを直接参照（OPTION A）。

**FILES**
```
src/app/api/research/bars/route.ts        ← Bar取得
src/app/api/research/backtest/route.ts    ← Backtest実行
src/app/api/research/status/route.ts      ← Access確認
src/lib/research-auth.ts                  ← 認証・entitlement確認
```

**API仕様（案）**
```
POST /api/research/bars
  Headers: X-System-Token: <customer system token>
  Body: { symbol, timeframe, from, to }
  → Research Access確認 → Historical bars返却

POST /api/research/backtest
  Headers: X-System-Token: <customer system token>
  Body: { strategy_spec, timeframe, period }
  → Research Access確認 → Backtest実行 → Result返却（Bar生データ非露出）
```

**SECURITY**
- Console Supabase Service Role KeyはConsole Server内のみ
- Customer System Tokenを発行・失効管理
- Research Access期限確認（customer_contracts.research_access_expires_at）
- Audit log（research_access_log）

**DEFINITION OF DONE**
- [ ] Research API認証フロー動作確認
- [ ] Trading View側のBacktestServiceをAPI経由に移行可能な状態
- [ ] 契約終了→API即時利用不可を確認

---

### 🚧 STAGE C8 — System Monitoring

**PURPOSE**: 顧客Systemの稼働状態をConsoleから確認できるようにする。

**CURRENT STATUS**: 未実装。

**FILES**
```
src/app/(admin)/monitoring/page.tsx
src/app/api/monitoring/route.ts
```

**DATABASE**: `system_health_logs`（C1で作成）

**Monitoring対象（Operational Telemetry）**
- Trading Gateway online/offline
- last_seen_at
- MT5 Bridge接続状態
- Bridge version
- アクティブStrategy数
- Research Access状態

**DEFINITION OF DONE**
- [ ] 顧客System一覧で稼働状態確認
- [ ] Customer 001で動作検証

**DO NOT DO**
- 顧客の取引詳細をConsoleへコピー
- 顧客Balance・Equityを無条件でConsoleに表示

---

### 🚧 STAGE C9 — Deployment / Version Management

**PURPOSE**: 顧客Systemのデプロイ履歴・Bridge Versionを管理する。

**CURRENT STATUS**: 未実装。

**FILES**
```
src/app/(admin)/customers/[id]/deployments/page.tsx
src/app/api/customers/[id]/deployments/route.ts
```

**DATABASE**: `deployments`テーブル（C1で作成）

**UI**
- デプロイ履歴（日時 / バージョン / Vercel URL / 実施者）
- Bridge EA Version管理
- rollback記録

---

### 🚧 STAGE C10 — Customer 001 Integration

**PURPOSE**: AVL自身をCustomer 001として登録し、End-to-End動作を検証する。

**CURRENT STATUS**: Customer Registryが未実装のため未実施。

**検証内容**
- Customer 001登録
- System Registry登録
- Contract登録（開発費・月額・Research Access）
- Strategy作成・Public ID発行
- GOLDでの Backtest（Research API経由）
- Trading View → Research API → Console Supabase の疎通

**DEFINITION OF DONE**
- [ ] Customer 001のE2E動作確認
- [ ] Research API経由Backtest動作確認
- [ ] 全ページで実データ表示確認

---

### 🚧 STAGE C11 — Customer 002 Isolation Validation

**PURPOSE**: Customer 002を別System構成で作成し、Customer間のデータ分離を検証する。

**CURRENT STATUS**: Customer Registry未実装のため未実施。

**検証内容**
- Customer 002登録（別GitHub/Vercel/Railway/Supabase）
- Customer 001と002が同じResearch APIを使用
- Customer 001のStrategyがCustomer 002に漏洩しないことを確認
- Command / Position / Deal が顧客間で混在しないことを確認

---

### 🚧 STAGE C12 — Console Production Readiness

**PURPOSE**: 本番運用のための最終整備。

**CURRENT STATUS**: 未実施。

**内容**
- Console自体のGitHub → Vercel自動デプロイ設定
- Admin権限管理（ADMIN_EMAILS管理UI）
- Console操作ログ
- エラー通知設定（Slack等）
- Console自体のバックアップ設計確認

---

## 9. Trading View ロードマップ（責任境界の整理）

> **重要**: Trading Viewの実装は、Console Roadmapのうち必要なStageが完了してから開始する。
> 現在の機能を壊さないことを最優先とする。

### 削除予定（優先度: 高）
- `user_subscriptions`テーブル（Stripe SaaS）
- `/api/stripe/` 各ルート
- Pricing UI
- Public Signup（再評価）
- SaaS Plan Badge

### 削除予定（優先度: 中）
- `src/presentation/components/os/` — DashboardOS、AI Brain、3D UI
- Voice / OpenAI Realtime
- Autonomous AI Order
- Three.js、GSAP依存

### KEEP（削除禁止）
- AI EA Builder（Strategy自然言語作成）
- Backtest UI
- Strategy Analysis / Improvement / Interpretation
- News / Economic Calendar
- MT5接続・Chart・Positions・Trade History

### 移行必要
- BacktestService: Supabase直接参照 → Research API経由

### GOLD専用化
- 不要なmulti-symbol UIの整理
- GOLD関連News/Calendarの強化

---

## 10. 最終アーキテクチャ図

```
AVL SIDE
═══════════════════════════════════════════════════════

AVL Console (avl-fx-console.vercel.app)
├── Customer Management（顧客・契約・System管理）
├── GOLD Data Management（データ収集設定・同期）
├── Strategy Registry（Public ID・Version・Sharing）
├── System Monitoring（顧客System稼働状態）
└── Research Dashboard
       │
       ├── Console Supabase (ghufhqodgrkftmhjozhj)
       │     ├── bar_data（GOLD OHLCV 約203万本+）
       │     ├── market_data_sync_jobs
       │     ├── customers
       │     ├── customer_systems
       │     ├── customer_contracts
       │     ├── strategy_registry（AVL Master）
       │     ├── strategy_versions
       │     └── strategy_shares
       │
       └── Console Gateway (avl-fx-console-production.up.railway.app)
             ↑ MT5 DataManager からリアルタイム受信
             ↑ 手動Sync Buttonで確定Bar保存
             │
AVL_Console_DataManager.ex5
（データ収集専用 / 取引機能なし）
AVL 管理MT5

━━━━━━━━━━━━━━━━━━━━━━
Research API  ←── Customer Trading View から認証付きリクエスト
  ↓ research_access_entitlement確認
  ↓ Backtest実行（AVL Server側）
  ↓ Result（Bar生データ非露出）返却
━━━━━━━━━━━━━━━━━━━━━━

CUSTOMER SIDE（顧客ごと独立構成）
═══════════════════════════════════════════════════════

Customer Trading View（顧客専用Vercel）
├── GOLDチャート
├── Market / Positions / History
├── EA / Strategy Builder（自然言語作成）
├── Backtest UI → Research API経由
├── News / Economic Calendar
└── Settings
       │
       ↓ HTTPS
Customer Trading Gateway（顧客専用Railway）
       │
       ↓ HTTPS
AVL_FX_Bridge.ex5（共通バイナリ / 顧客がコンパイル不要）
       │
       ↓
Customer MT5 GOLD Chart
       │
       ↓
Broker
```

---

## 11. 実装Stage順序の根拠

```
C1（DB Foundation）→ C2（GOLD Config）→ C3（Customer）
→ C4（Customer System）→ C5（Contract）→ C6（Strategy Registry）
→ C7（Research API）→ C8（Monitoring）→ C9（Deployment）
→ C10（Customer 001）→ C11（Customer 002）→ C12（Production）
```

**理由**:
- C1を最初にすることで後からDB再設計が不要
- C3はC4（System）・C5（Contract）の前提
- C6（Strategy）はC3（Customer）の後でないとcreator_customer_id参照できない
- C7（Research API）はC6の後でないとStrategy entitlement確認ができない
- C10・C11はC1〜C9が揃ってから

---

## 12. 注意事項

### 法務
- Backtest結果は「過去Historical Dataでの結果」として表示
- 将来利益の保証・断定的推奨をシステムに組み込まない
- AI改善提案も「このパラメータ変更時に過去データでは結果がこう変化した」という表現

### 表現禁止
- 「必ず勝てる」「絶対利益」「勝率90%保証」等

### セキュリティ設計原則
- Console Supabase Service Role → Console Server内のみ
- Customer側へのSecret非露出
- Research APIは認証・期限・audit log必須

---
*Audit Date: 2026-09-18 | GOLD Specialized Scope Lock*
