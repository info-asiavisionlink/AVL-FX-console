# Console Gateway — Railway デプロイ手順

このgateway/ディレクトリをRailwayの**独立したサービス**としてデプロイします。

## Railway設定手順

### 1. Railwayで新規Projectを作成（またはexisting projectに追加）

https://railway.app

### 2. GitHub連携でServiceを追加

- 「Add Service」→「GitHub Repo」
- Repository: `info-asiavisionlink/AVL-FX-console`
- **Root Directory: `gateway`** ← 必ずここを設定

### 3. 環境変数を設定

Railway Dashboardの「Variables」タブで以下を設定：

```
SUPABASE_URL=https://ghufhqodgrkftmhjozhj.supabase.co
SUPABASE_SERVICE_KEY=<Console Supabase Service Role Key>
SUPABASE_SERVICE_ROLE_KEY=<Console Supabase Service Role Key>
CONSOLE_GATEWAY_SECRET=<任意のシークレット文字列 — MT5 DataManagerと同じ値>
MT5_GATEWAY_SECRET=<CONSOLE_GATEWAY_SECRETと同じ値>
PORT=8081
```

### 4. デプロイ確認

デプロイ完了後、以下のURLでヘルスチェック：
```
https://your-console-gateway.up.railway.app/health
```

レスポンス例：
```json
{
  "status": "ok",
  "version": "1.0",
  "role": "Console Gateway (Data Only)",
  "eaConnected": false
}
```

### 5. Vercel Console AppにGateway URLを設定

Vercel Dashboard → avl-fx-console → Environment Variables:
```
MT5_GATEWAY_URL=https://your-console-gateway.up.railway.app
MT5_GATEWAY_SECRET=<CONSOLE_GATEWAY_SECRETと同じ値>
```

### 6. Console .env.localも更新（ローカル開発用）

```
MT5_GATEWAY_URL=https://your-console-gateway.up.railway.app
MT5_GATEWAY_SECRET=<CONSOLE_GATEWAY_SECRETと同じ値>
CONSOLE_GATEWAY_URL=https://your-console-gateway.up.railway.app
CONSOLE_GATEWAY_SECRET=<同じ値>
```

## Gitプッシュで自動デプロイ

Railway → GitHub連携後は、`main`ブランチへのpushで自動デプロイされます。

```bash
cd "/Desktop/AVL-FX console"
git add -A
git commit -m "fix: gateway update"
git push  # → Railway自動デプロイ
```

## ビルドの仕組み

Railway は`gateway/`ディレクトリの`Dockerfile`を使ってビルドします：
1. `npm install`（devDependencies含む）
2. `npm run build`（TypeScript → dist/）
3. `node dist/index.js`で起動

## 注意事項

- このGatewayは**データ収集専用**です
- BUY/SELL/CLOSE等の取引注文は処理しません
- Trading View Gatewayとは**別サービス**として運用してください
