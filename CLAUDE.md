# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# 起動
node index.js

# 依存関係インストール
npm install

# ユーザーのuniqueIdを確認（管理者設定用）
node check-unique-ids.js

# DBマイグレーション（uniqueId付与）
node migrations/add-unique-ids.js
```

テストスクリプトは未設定（`npm test` はエラー終了）。

## 環境変数（`.env`）

| 変数名 | 用途 |
|---|---|
| `mongo_url` | MongoDB Atlas接続URL |
| `domain` | ベースドメイン（例: `orrn.net`）|
| `PORT` | ポート番号（デフォルト: 3000）|
| `SESSION_SECRET` | signedCookieの署名鍵 |
| `admin_unique_ids` | 管理者uniqueIdのカンマ区切りリスト |
| `ORARAN_BASE` | PIN認証外部API URL |
| `ORARAN_API_KEY` | PIN認証外部API鍵 |

## アーキテクチャ

### セッション管理

認証状態は `signed cookie`（`cookie-parser`）で管理。Cookie名は `user_session`、値はJSON文字列。`req.signedCookies.user_session` から取得し、`JSON.parse()` でユーザー情報を復元する。この処理は各ルートで共通の `parseSession(req)` ヘルパーで行う（`routes/dash.js` に定義）。

### ユーザー識別

`users` コレクションの `uniqueId`（`crypto.randomBytes(16).toString('hex')`）が識別子。MongoDB ObjectId（`_id`）は後方互換性のために `userid` フィールドに保持されているが、新規コードでは `uniqueId` を使う。

### プレミアム判定

`preuser`（コレクション名: `preuseradd`）に `{ id: uniqueId }` が存在するかどうかで判定。プレミアムユーザーはカスタム短縮URLを使える。

### API認証フロー

`functions/apiAuth.js` が2つのミドルウェアを提供:
1. `authenticateToken` — `Authorization: Bearer <token>` ヘッダーを検証し、`req.user.uniqueId` をセット
2. `logApiUsage` — `res.send` をラップしてレスポンス後に `apiUsage` コレクションへ非同期記録

API使用量制限は `functions/usageLimits.js` の `checkApiLimit()` で月次集計。

### URL短縮の仕組み

- URLは `tinyurl` コレクションに保存
- 短縮コード（`tiny` フィールド）: ランダムは `crypto.randomBytes(4).toString('hex')`、カスタムはユーザー指定
- リダイレクト: `GET /t/:id` → `routes/tiny.js` が `tinyurl` を検索して `res.redirect()`
- `javascript:` や `data:` などの危険プロトコルは `SAFE_PROTOCOLS` 正規表現でブロック

### メール認証（PIN）フロー

新規登録時に外部サービス（`ORARAN_BASE`）へPINを送信・検証するAPIを経由する。`routes/register.js` の `POST /register/send-pin` → `POST /register/` の2ステップ。

### フロントエンド（CSS）

Tailwind CDNは使用していない。`public/css/main.css` にBootstrap 3風の生CSSを定義（カラー: `#337ab7` blue、`#2c3e50` navbar、`#f5f5f5` body）。すべてのEJSビューはこのファイルを読み込む。

### 管理者機能

`routes/admin.js` でCookieの `uniqueId` が `process.env.admin_unique_ids`（カンマ区切り）に含まれるかチェック。

### cron・バッチ

`index.js` で毎月1日16:00（UTC）に `functions/dataremove.js` の `dataRemove()` を実行（古いデータ削除）。

### ログ

`fs.appendFile` で `./log/YYYY.MM.DD.log` に404アクセスを記録。`morgan` でHTTPリクエストログを標準出力。
