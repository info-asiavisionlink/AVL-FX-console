# Console / Trading View Complete Separation Log

**Date:** 2026-09-11  
**Status:** COMPLETE

---

## Before Structure

```
/Desktop/AVL_FX trading view/          ← Monorepo root (all mixed)
├── apps/
│   ├── console/                       ← Console Next.js app (admin)
│   └── trading-view/                  ← Trading View Next.js app
├── gateway/                           ← COMBINED Gateway (data + execution)
├── services/gateway/                  ← Duplicate gateway (removed)
├── ea/
│   ├── AVL_DataManager_v2.mq5        ← Console EA
│   ├── AVL_FX_Bridge.mq5             ← Trading EA
│   └── AVL_ExecutionBridge.mq5       ← Trading EA
├── mt5/
│   ├── data-manager/                  ← Console MT5 (removed from TV)
│   └── execution-bridge/             ← Trading MT5
├── packages/                          ← Empty workspace packages
├── supabase/migrations/               ← Mixed migrations (all in one)
└── package.json                       ← Workspace config

/Desktop/AVL-FX console/               ← Empty directory
```

---

## After Structure

### AVLFX Console (Independent Repo)

```
/Desktop/AVL-FX console/
├── src/
│   ├── app/
│   │   ├── (admin)/
│   │   │   ├── dashboard/page.tsx     ← Gateway health + Supabase status
│   │   │   ├── gateway/page.tsx       ← Console Gateway monitoring
│   │   │   ├── historical/page.tsx    ← bar_data statistics
│   │   │   ├── market-data/page.tsx   ← Realtime market data view
│   │   │   ├── mt5/page.tsx           ← MT5 DataManager status
│   │   │   ├── system/page.tsx        ← System health diagnostics
│   │   │   └── layout.tsx             ← Admin layout with nav
│   │   ├── api/auth/                  ← Supabase Auth callback/logout
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── page.tsx                   ← Redirects to /dashboard
│   ├── lib/
│   │   └── admin-auth.ts              ← ADMIN_EMAILS allowlist auth
│   └── middleware.ts                  ← Auth guard (public = login only)
├── gateway/
│   ├── src/
│   │   ├── index.ts                   ← Console Gateway (NO execution)
│   │   ├── barDataStore.ts            ← Supabase bar_data upsert
│   │   └── syncJobStore.ts            ← Sync Job management
│   ├── package.json                   ← avlfx-console-gateway
│   ├── tsconfig.json
│   └── Dockerfile
├── supabase/migrations/
│   ├── 001_bar_data.sql               ← bar_data table (Console Supabase)
│   ├── 002_bar_data_rls_open.sql      ← RLS policies
│   ├── 003_market_data_sync_jobs.sql  ← Sync job management
│   └── 004_sync_job_recovery.sql      ← Stale job recovery
├── mt5/
│   └── AVL_Console_DataManager.mq5   ← Data-only EA (NO trade capability)
├── package.json                       ← Standalone (avlfx-console)
├── tsconfig.json
├── next.config.ts
├── .env.example                       ← Console-specific ENV keys
├── .gitignore
└── README.md
```

### AVLFX Trading View (Restructured — Independent)

```
/Desktop/AVL_FX trading view/
├── src/                               ← Moved from apps/trading-view/src/
│   ├── app/                           ← All Trading View pages
│   ├── application/
│   ├── components/
│   ├── domain/
│   ├── infrastructure/
│   │   └── supabase/
│   │       ├── admin.ts               ← Trading View service role client
│   │       └── ...
│   ├── lib/
│   ├── presentation/
│   └── types/
├── public/                            ← Moved from apps/trading-view/public/
│   ├── charting_library/
│   └── ...
├── gateway/                           ← Trading Gateway (full execution)
│   ├── src/
│   │   ├── index.ts                   ← Full gateway with execution bridge
│   │   ├── barDataStore.ts
│   │   ├── executionStore.ts
│   │   └── syncJobStore.ts
│   └── package.json                   ← avlfx-trading-gateway
├── supabase/migrations/               ← All Trading View migrations
│   ├── 001_cot_positions.sql
│   ├── 004_strategy_registry.sql
│   ├── 005_backtest.sql
│   └── ... (016-020 execution tables)
├── mt5/
│   └── execution-bridge/              ← Customer MT5 bridge (trading capable)
│       ├── AVL_FX_Bridge.mq5
│       └── AVL_ExecutionBridge.mq5
├── ea/                                ← Trading EAs only
│   ├── AVL_FX_Bridge.mq5
│   └── AVL_ExecutionBridge.mq5
├── scripts/                           ← Backtest/research scripts
├── package.json                       ← Standalone (avlfx-trading-view)
├── tsconfig.json
├── next.config.ts
├── .env.example                       ← Trading View-specific ENV keys
└── .gitignore
```

---

## Moved Files (Console → New Repo)

| Source (Trading View) | Destination (Console) |
|---|---|
| `apps/console/src/app/**` | `src/app/**` |
| `apps/console/src/lib/admin-auth.ts` | `src/lib/admin-auth.ts` |
| `apps/console/src/middleware.ts` | `src/middleware.ts` |
| `apps/console/package.json` | `package.json` (standalone) |
| `apps/console/tsconfig.json` | `tsconfig.json` |
| `apps/console/next.config.ts` | `next.config.ts` |
| `gateway/src/barDataStore.ts` | `gateway/src/barDataStore.ts` |
| `gateway/src/syncJobStore.ts` | `gateway/src/syncJobStore.ts` |
| `ea/AVL_DataManager_v2.mq5` (base) | `mt5/AVL_Console_DataManager.mq5` (trade-removed) |
| `supabase/migrations/002_bar_data.sql` | `supabase/migrations/001_bar_data.sql` |
| `supabase/migrations/003_bar_data_rls_open.sql` | `supabase/migrations/002_bar_data_rls_open.sql` |
| `supabase/migrations/014_market_data_sync_jobs.sql` | `supabase/migrations/003_market_data_sync_jobs.sql` |
| `supabase/migrations/015_sync_job_recovery.sql` | `supabase/migrations/004_sync_job_recovery.sql` |

---

## Removed from Trading View

- `apps/console/` — entire Console app
- `apps/trading-view/` — moved to root (flattened)
- `apps/` — directory removed
- `packages/` — empty directory removed
- `services/gateway/` — duplicate gateway removed
- `ea/AVL_DataManager_v2.mq5` — Console EA removed
- `ea/AVL_DataManager_v2.ex5` — Console EA binary removed
- `mt5/data-manager/` — Console MT5 removed
- Duplicate backup files (`*\ 2.ts`, `*\ 2.tsx`)

---

## ENV Split

### Console ENV (`/AVL-FX console/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=         ← Console-specific Supabase project
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=        ← Console Supabase service role
MT5_GATEWAY_URL=                  ← Console Gateway URL
MT5_GATEWAY_SECRET=               ← Console Gateway secret
CONSOLE_GATEWAY_URL=
CONSOLE_GATEWAY_SECRET=
ADMIN_EMAILS=                     ← Admin allowlist
```

### Trading View ENV (`/AVL_FX trading view/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=         ← Trading View Supabase project
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=        ← Trading View Supabase service role
NEXT_PUBLIC_MT5_GATEWAY_HTTP_URL= ← Trading Gateway URL
MT5_GATEWAY_URL=
MT5_GATEWAY_SECRET=               ← Trading Gateway secret
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
```

---

## Supabase Split Design

| Data | Console Supabase | Trading View Supabase |
|---|---|---|
| bar_data | ✓ (admin ingestion) | ✓ (backtest/chart - current DB) |
| market_data_sync_jobs | ✓ | — |
| profiles | — | ✓ |
| mt5_connections | — | ✓ |
| execution_commands | — | ✓ |
| strategies | — | ✓ |
| backtest results | — | ✓ |
| live_positions | — | ✓ |
| live_deals | — | ✓ |

**Note:** The current Trading View Supabase still has the `bar_data` table 
and it is the source for backtest/chart data. The new Console Supabase 
(to be created by user) will have its own `bar_data` for admin data management.
The Trading View's dependency on `bar_data` remains until Research API is implemented.

---

## Gateway Split

### Console Gateway (port 8081)
- Handles: tick, bar, bars/bulk, positions (admin-read), account (admin-read), heartbeat, symbols, indicators, history, data-commands (sync jobs)
- Does NOT handle: execution commands, BUY/SELL/CLOSE, bridge endpoints
- Connects to: Console Supabase (bar_data)

### Trading Gateway (port 8080)
- Handles: tick, bar, bars/bulk, positions, account, heartbeat, symbols, execution-commands, bridge endpoints
- Connects to: Trading View Supabase (mt5_connections, execution_commands, etc.)

---

## MT5 Split

### Console MT5: `AVL_Console_DataManager.mq5`
- Data collection only
- NO OrderSend, CTrade, BUY/SELL
- Connects to Console Gateway
- Source: AVL_DataManager_v2.mq5 with trade code removed

### Trading MT5: `AVL_FX_Bridge.mq5` + `AVL_ExecutionBridge.mq5`
- Full trading capability (BUY/SELL/CLOSE/MODIFY)
- Connects to Trading Gateway
- Customer MT5 accounts

---

## Build Results

| Component | Status |
|---|---|
| AVLFX Console (Next.js) | ✓ PASS |
| Console Gateway (TypeScript) | ✓ PASS |
| AVLFX Trading View (Next.js) | ✓ PASS |
| Trading Gateway (TypeScript) | ✓ PASS |

---

## Remaining Risks / Next Steps

1. **Console Supabase**: User needs to create new Supabase project and set `.env.local` values
2. **Console Gateway Secret**: User needs to set `CONSOLE_GATEWAY_SECRET` in Console gateway `.env`
3. **Trading View bar_data dependency**: Still reads `bar_data` from Trading View Supabase. Will be migrated to Research API in a future stage.
4. **SaaS/Stripe**: Still present in Trading View (pricing, subscriptions). Scheduled for deletion in a future stage.
5. **JARVIS/AI features**: DashboardOS, voice chat, autonomous AI — still in Trading View, scheduled for deletion.
6. **Git SSH URLs**: User needs to provide SSH URLs to link both repos to separate remote repositories.
7. **Railway**: Two separate Railway deployments needed (Console Gateway + Trading Gateway).
8. **Vercel**: Two separate Vercel projects needed (Console + Trading View).

---

## Console Supabase Setup (Next Steps for User)

After creating a new Supabase project:

1. Set in `/AVL-FX console/.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_CONSOLE_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Run Console Supabase migrations:
   ```
   supabase db push --project-ref YOUR_CONSOLE_PROJECT_REF
   ```
   Or run each migration file manually in Supabase SQL editor.

3. Set `ADMIN_EMAILS` in `.env.local`

4. Deploy Console Gateway to Railway with Console Supabase credentials.

5. Set `MT5_GATEWAY_URL` and `MT5_GATEWAY_SECRET` in Console `.env.local`

---

## Git SSH URL Setup (Next Steps for User)

After receiving SSH URLs:

```bash
# AVLFX Console
cd "/Desktop/AVL-FX console"
git remote add origin git@github.com:YOUR_ORG/avlfx-console.git
git push -u origin main

# AVLFX Trading View
cd "/Desktop/AVL_FX trading view"
git remote add origin git@github.com:YOUR_ORG/avlfx-trading-view.git
git push -u origin main
```
