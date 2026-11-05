# 公開手順（Cloudflare）

Supabase + Vercel から Cloudflare（Worker + D1 + Access）に移した（2026-11）。
公開は GitHub 連携（Workers Builds）で行う。`main` に push すると Cloudflare が自動でビルドして公開する。
tenokori と同じ構成なので、迷ったら `tenokori/docs/deploy.md` も参照。

## 済んでいること（2026-11-06）

- D1 データベース `life-free`（APAC）を作成し、`0001_init.sql` を適用済み（`d1_migrations` にも記録）
- Supabase のデータ（月次記録7件・設定3件・共有プロフィール2件）を D1 に投入し、件数・金額の合計・メモの文字数が一致することを確認済み
- `wrangler.jsonc` の `database_id` を設定済み
- 手元（`npm run dev`）で、一覧表示・追加・更新・削除・入力チェックの動作を確認済み

## 残作業

### 1. GitHub リポジトリをつなぐ（涼）

1. Cloudflare ダッシュボード → Workers & Pages → Create → Import a repository
2. `takebayashi-ryo/Life-free` を選ぶ
3. 設定：
   - Project name：`life-free`（`wrangler.jsonc` の `name` と同じにする）
   - Production branch：`main`
   - Build command：`npm run build`
   - Deploy command：`npx wrangler deploy`
   - 環境変数（Build variables）：`GEMINI_API_KEY`（Vercel に入れていた値。AI 機能がビルド時に埋め込む）
4. Save and Deploy

公開先は `https://life-free.tenokori-ryo.workers.dev`。
Access の設定前は API がすべて 401 を返す（誰でもデータを見られる状態にはならない）。

### 2. Cloudflare Access で入口を守る（涼）

1. Zero Trust → Access → Applications → Add an application → Self-hosted
2. Application domain：`life-free.tenokori-ryo.workers.dev`
3. Policy：Allow、Include = Emails に自分のメールアドレス
4. Login methods：One-time PIN
5. 保存後、Application Audience (AUD) Tag を Claude に伝える（チームドメインは tenokori と同じ `odd-snowflake-1e55.cloudflareaccess.com`）

### 3. Worker に Access の設定を入れる（Claude）

`wrangler.jsonc` の `vars` に `ACCESS_TEAM_DOMAIN` と `ACCESS_AUD` を入れて push する。

### 4. 確認して切り替える

- プライベートウィンドウで開くと、メール → 確認コード → アプリ の順になる
- 記録・設定・予測が Supabase 時代と同じ数字で表示される
- 問題なければ Vercel のプロジェクトを止め、Supabase の `Life free` プロジェクトを一時停止（不要が確定したら削除）

## 開発

```bash
npm install
cp .dev.vars.example .dev.vars   # Access なしで動かすための開発用ユーザー
npm run db:migrate:local         # 手元の D1 にテーブルを作る
npm run dev
```

## テーブルを変えるとき

`migrations/` に新しいファイルを足し、Claude が Cloudflare コネクタで本番の D1 に適用して `d1_migrations` に記録する。

## バックアップ

- D1 の Time Travel で過去の時点に戻せる
- 移行時点のデータ：`~/Downloads/life-free/backup/supabase-2026-11-05.json`（git には入れない）
