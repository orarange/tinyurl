# Tiny-URL

シンプルで高速なURL短縮サービス

## 概要

Tiny-URLは、Node.js + Express + MongoDBで構築されたURL短縮サービスです。メール/パスワード認証によるユーザー管理、プレミアムプラン、管理者機能を備えています。

## 特徴

- 🔗 **URL短縮**: 長いURLを短く変換
- 👤 **ユーザー認証**: メール/パスワードでの安全なログイン（2FA対応）
- 🔑 **APIトークン**: プログラムからのAPI利用に対応
- 📈 **使用状況追跡**: API利用回数を自動記録
- ⭐ **プレミアムプラン**: カスタムURL設定機能
- 📊 **ダッシュボード**: 自分が作成したURLとAPIトークンの管理
- 🚀 **高パフォーマンス**: レート制限・MongoDB接続最適化
- 📱 **レスポンシブデザイン**: カスタムCSS（Bootstrap 3風）によるUI

## 技術スタック

- **バックエンド**: Node.js, Express.js
- **データベース**: MongoDB (Mongoose ODM)
- **認証**: Cookie-based セッション管理
- **テンプレートエンジン**: EJS
- **スタイリング**: カスタムCSS（Bootstrap 3風、`public/css/main.css`）
- **セキュリティ**: bcrypt (パスワードハッシュ化)
- **その他**: express-rate-limit, cloudflare-express

## 前提条件

- Node.js (v14以上)
- MongoDB Atlas アカウント (またはローカルMongoDB)
- npm または yarn

## インストール

### 1. リポジトリをクローン

```bash
git clone https://github.com/orarange/tinyurl.git
cd tinyurl
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 環境変数を設定

`.env`ファイルを作成:

```env
# MongoDB接続URL
mongo_url=mongodb+srv://username:password@cluster.mongodb.net/database

# ドメイン設定
domain=yourdomain.com

# ポート設定
PORT=3000

# Cookie署名シークレット（本番環境では必ず強力なランダム文字列を設定）
SESSION_SECRET=your-strong-random-secret

# 管理者uniqueIdリスト（カンマ区切り）
admin_unique_ids=your_unique_id_1,your_unique_id_2

# PIN認証外部API（メール認証用）
ORARAN_BASE=https://oraran.jp
ORARAN_API_KEY=your_api_key
```

### 4. アプリケーションを起動

```bash
node .
```

サーバーは `http://localhost:3000` で起動します。

## ディレクトリ構造

```
tinyurl/
├── APIs/               # API エンドポイント
│   ├── index.js       # URL短縮API
│   ├── geturl.js      # URL取得API
│   └── gettiny.js     # 短縮URL検索API
├── functions/          # ユーティリティ関数
│   ├── login.js       # ログイン処理
│   └── register.js    # ユーザー登録
├── models/            # Mongooseモデル
│   ├── users.js       # ユーザーモデル
│   ├── tinyurl.js     # フリープランURL
│   ├── premium.js     # プレミアムURL
│   └── preuser.js     # プレミアムユーザー
├── routes/            # ルート定義
│   ├── index.js       # メインページ・URL短縮
│   ├── login.js       # ログイン
│   ├── register.js    # 新規登録
│   ├── dash.js        # ダッシュボード
│   ├── admin.js       # 管理者パネル
│   ├── tiny.js        # リダイレクト処理
│   └── ...
├── views/             # EJSテンプレート
├── public/            # 静的ファイル
│   ├── css/
│   ├── images/
│   ├── robots.txt
│   └── sitemap.xml
├── index.js           # アプリケーションエントリーポイント
├── package.json
└── .env              # 環境変数 (gitignore)
```

## 主な機能

### URL短縮

- フリープラン: ランダムな短縮URLを生成
- プレミアムプラン: カスタムURLを設定可能
- すべての短縮URLは `/t/` プレフィックスを使用

### ユーザー管理

- メール/パスワードでの新規登録
- セキュアなログイン (bcryptでハッシュ化)
- uniqueIdベースのユーザー識別システム

### ダッシュボード

- 作成したURLの一覧表示
- URL削除機能
- プレミアムステータス確認

### 管理者機能

- 全URLの閲覧・削除
- ユーザー管理
- プレミアムユーザーの追加・削除
- 一括削除機能

## API エンドポイント

すべてのAPIエンドポイントは**APIトークンによる認証が必要**です。

### 認証

1. ダッシュボードでAPIトークンを生成
2. リクエストヘッダーに `Authorization: Bearer <token>` を含める

### URL短縮API

```bash
POST /api/make
Authorization: Bearer turl_your_api_token_here
Content-Type: application/json

{
  "original": "https://example.com/very-long-url",
  "custom": "myurl"  // オプション (プレミアムのみ)
}
```

**レスポンス:**
```json
{
  "status": "200",
  "message": "request was successful!",
  "tiny": "https://yourdomain.com/t/abc123"
}
```

### URL取得API

```bash
GET /api/get?t=shortcode
Authorization: Bearer turl_your_api_token_here
```

**レスポンス:**
```json
{
  "status": 200,
  "original": "https://example.com/very-long-url"
}
```

### 短縮URL検索API

```bash
GET /api/gettiny?o=https://example.com
Authorization: Bearer turl_your_api_token_here
```

**レスポンス:**
```json
{
  "status": 200,
  "tiny": "abc123"
}
```

### API使用状況

- すべてのAPIリクエストは自動的に記録されます
- ダッシュボードで今月の使用回数を確認できます
- トークンごとの最終使用日時も表示されます

## デプロイ

### Apache + Reverse Proxy

1. Apacheをインストール:
```bash
sudo apt install apache2
```

2. 必要なモジュールを有効化:
```bash
sudo a2enmod proxy proxy_http ssl rewrite headers http2
```

3. 設定ファイルを作成 (`/etc/apache2/sites-available/yourdomain.conf`):
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    Protocols h2 http/1.1
</VirtualHost>
```

4. サイトを有効化:
```bash
sudo a2ensite yourdomain.conf
sudo systemctl reload apache2
```

### PM2でプロセス管理

```bash
npm install -g pm2
pm2 start index.js --name tinyurl
pm2 startup
pm2 save
```

## 開発

### ローカル開発サーバー

```bash
node .
```

### ユーザーのuniqueIDを確認

```bash
node scripts/check-unique-ids.js
```

管理者に設定したいユーザーの`uniqueId`を`.env`の`admin_unique_ids`に追加してください。

## セキュリティ

- ✅ パスワードはbcryptでハッシュ化
- ✅ HTTPSでの通信を推奨
- ✅ Rate Limiting (1分間に30リクエスト、APIエンドポイント)
- ✅ Cookie httpOnly フラグ
- ⚠️ 本番環境では`secure`フラグを有効化推奨

## ライセンス

ISC

## 作者

orarange

## サポート

問題が発生した場合は、[GitHub Issues](https://github.com/orarange/tinyurl/issues)で報告してください。

---

**ドメイン**: [orrn.net](https://orrn.net)