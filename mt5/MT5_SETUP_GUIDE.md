# AVL Console DataManager — MT5セットアップガイド

## 概要

`AVL_Console_DataManager.mq5` をMT5に設置して、
リアルタイム価格データをConsole Gatewayへ送信します。

**役割:**
- 全シンボルのTick・OHLCバーを Console Gatewayへ送信
- GatewayがSupabaseへbar_dataとして永続保存
- 取引注文は一切行いません（Data Collector専用）

---

## 接続先

| 設定 | 値 |
|---|---|
| Gateway URL | `https://avl-fx-console-production.up.railway.app` |
| Gateway Secret | `27b2ac63aa0000653e6e50832ca5e6daf2e344e718af6276949439652dfec4d9` |

---

## MT5セットアップ手順

### 1. EAファイルをコピー

```
AVL_Console_DataManager.mq5
↓
MT5のデータフォルダ > MQL5 > Experts > に配置
```

MT5メニュー: `ファイル` → `データフォルダを開く` → `MQL5/Experts/`

### 2. コンパイル

MT5のMetaEditorを開く（F4キー）
→ `AVL_Console_DataManager.mq5` を開く
→ `コンパイル`（F7キー）
→ エラーなしで `AVL_Console_DataManager.ex5` が生成される

### 3. WebRequest許可リストに追加

MT5メニュー: `ツール` → `オプション` → `エキスパートアドバイザー`
→ 「WebRequestを許可するURLリスト」にチェック
→ 以下を追加:

```
https://avl-fx-console-production.up.railway.app
```

### 4. チャートへアタッチ

- 任意のシンボルのチャートを開く（例: EURUSD H1）
- ナビゲーターから `AVL_Console_DataManager` をドラッグ＆ドロップ
- パラメータ画面が開く

### 5. パラメータ確認

デフォルトで以下が入っています（変更不要）:

| パラメータ | 値 |
|---|---|
| InpServerURL | `https://avl-fx-console-production.up.railway.app` |
| InpServerSecret | `27b2ac63aa0000653e6e50832ca5e6daf2e344e718af6276949439652dfec4d9` |
| InpOHLCHistory | `5000`（起動時に過去5000本を一括送信） |
| InpHistorySyncEnabled | `false`（必要に応じて`true`にすると過去データを大量取得） |

「自動売買を許可する」にチェックが入っていることを確認して「OK」

### 6. 動作確認

EA起動後、Console Dashboard で以下を確認:
- `https://avl-fx-console.vercel.app/gateway` → EA接続中が表示
- `https://avl-fx-console.vercel.app/market-data` → リアルタイム価格が表示

---

## 過去データを大量取得したい場合（History Sync）

チャートアタッチ時のパラメータで:

```
InpHistorySyncEnabled = true   （チェックを入れる）
InpHistorySyncMonths  = 24     （取得したい月数）
InpHistorySyncTFs     = M5,H1,H4,D1  （対象時間足）
```

※ History Sync中はMT5が一時的に重くなります。完了後は自動で通常モードに戻ります。

---

## データフロー

```
MT5チャート（Admin MT5）
    ↓ HTTPS POST（毎Tick / 毎バー）
Console Gateway (Railway)
https://avl-fx-console-production.up.railway.app
    ↓ Supabase UPSERT
Console Supabase (bar_data)
https://ghufhqodgrkftmhjozhj.supabase.co
    ↓
AVLFX Console Dashboard
https://avl-fx-console.vercel.app
```

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| EA起動直後にエラー | WebRequest未許可 | ツール→オプション→URLリストに追加 |
| Tick送信されない | Secret不一致 | InpServerSecretを確認 |
| bar_data増えない | Supabase設定ミス | Gateway /health を確認 |
| Console画面に表示なし | MT5_GATEWAY_URL未設定 | Vercel ENVを確認 |
