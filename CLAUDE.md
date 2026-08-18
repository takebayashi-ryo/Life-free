# Life free

「月末の資産スナップショット」で長期の資産形成を追う個人資産管理アプリ (Personal Finance / Net Worth Tracker)。将来的にはiOSリリースを見据えている。

## プロジェクト概要

**ターゲット**: 家計簿ではなく、月次の資産推移とライフプランを重視する層
**運用イメージ**: マネフォME等の細かい家計簿ではなく、月1回の残高確認 → 長期の資産推移と将来予測を追う

### 差別化ポイント
- 使用日ベースの家計簿ではなく **月末スナップショット** (実際の口座残高と一致)
- **ライフプラン・タイムライン** (子供の成長に応じた投資額変動を可視化)
- **AI相談** (Gemini API)
- iOSリリース見据えたユーザー中心設計・引き算のデザイン

## タブ構成

| タブ | 内容 |
|---|---|
| ホーム | 総資産・先月比・現金目標・最近の記録・戦略フェーズ・年齢チップ |
| 記録 | 月次レポート一覧・note記事の下書き生成・CSVエクスポート(月単位)・前月コピー |
| 予測 | 前提条件 → ライフプラン・タイムライン → 資産推移予測グラフ → 年次表 |
| 分析 | 資産推移グラフ(総資産/現金/投資/月次投資)・AI質問応答 |
| 設定 | プロフィール(自分+子供)・テーマ・マスキング・財務パラメータ |

## 技術スタック

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** (CDN経由、`darkMode: 'class'`)
- **Recharts** (グラフ)
- **Supabase** (月次レコード永続化)
- **Google Gemini API** — アドバイス・質問応答・年別イベント提案
- **Vercel** (ホスティング・自動デプロイ)
- **GitHub Actions** (CI: 型チェック + ビルド)

## ファイル構成

```
App.tsx                     # メインコンポーネント・全タブのルーター兼状態管理
types.ts                    # 型定義 (FinancialConfig, MonthlyRecord, UserProfile, LifePlan...)
services/
  dataService.ts            # Supabase records CRUD
  simulationService.ts      # 複利計算 (SimulationPhase[] 対応)
  lifePlanService.ts        # LifePlan生成・年齢文脈の構築・SimulationPhaseへの変換
  settingsService.ts        # app_settings テーブルへの設定の読み書き
  noteArticleService.ts     # note記事の組み立て (金額はここで確実に埋める)
  geminiService.ts          # AI (アドバイス・質問応答・年別イベント提案)
components/
  MonthEditor.tsx           # 月次記録の追加/編集モーダル
  AnalysisChart.tsx         # 資産推移グラフ (分析タブ用)
  Simulator.tsx             # 予測タブ全体 (LifePlanTimelineを内包)
  LifePlanTimeline.tsx      # ライフプラン年カードのUI
  NoteArticleModal.tsx      # note記事の下書き表示・コピー
.github/workflows/ci.yml    # CI (型チェック + ビルド)
.claude/skills/release/     # /release — 検証からmain反映までの手順
.claude/settings.json       # 検証コマンドの実行許可
vite.config.ts              # APIキーを process.env.API_KEY に注入
index.html                  # Tailwind CDN + darkMode設定
```

## デザイン方針 (重要)

### カラーパレット (引き算の哲学)
- 基調: **モノクロ** (zinc-50 / 900 / 950)
- アクセント: 緑 = 正の数値、赤 = 負の数値 のみ
- ヒーローカードは常に**フラットな黒** (`bg-zinc-950 dark:bg-zinc-900`)
- **禁止**: グラデーション、blur装飾、色付きアイコン背景、多色使い

### タイポグラフィ
- Font: Inter
- 数字は `tracking-tight` で引き締め

### ダークモード
- 設定タブで **ライト / ダーク / 自動** の3択
- 全コンポーネントに `dark:` バリアント必須
- localStorage `lifefree_theme_v1` に保存
- グラフは `useIsDark` フックで色を動的切替

### モバイルファースト
- max-width: 2xl (672px) センタリング
- 下部にfixed tab nav、`env(safe-area-inset-bottom)` 対応
- タッチしやすいボタンサイズ

## 検証コマンド (重要)

```bash
npm run typecheck   # tsc --noEmit — 型エラーを検出
npm run build       # vite build — バンドル生成
```

⚠️ **`npm run build` だけでは型エラーを検出できません。** Viteは内部でesbuildを使っており、
型注釈を剥がすだけで型検査はしません。**必ず `typecheck` も実行してください。**

## CI (GitHub Actions)

`.github/workflows/ci.yml` が全ブランチへのpushとmainへのPRで自動実行されます。

| ステップ | 内容 |
|---|---|
| `npm ci` | lockfile通りに依存をインストール |
| `npm run typecheck` | 型エラー検出 |
| `npm run build` | ビルド検証 |

- 実行時間の目安: 約20秒
- 同じブランチに連続pushした場合、古い実行は自動キャンセル (`concurrency`)
- **GitHub MCP経由で直接編集した場合も、このCIが安全網になります**

## 開発ワークフロー

### `/release` を使う
検証 → コミット → push → CI確認 → CLAUDE.md更新 までを一続きで行う Skill を
`.claude/skills/release/` に置いてある。「リリースして」で呼び出せる。
手順を思い出しながら並べるのではなく、この Skill に従うこと。


### 優先: GitHub MCP経由での直接編集 (推奨)
- 小〜中規模の変更: `mcp__github__create_or_update_file` / `push_files` で直接リモート書き換え
- 状態同期のブレを防ぐ (以前ローカル/リモートが食い違ってトラブルあり)
- push後は **必ず `actions_list` / `actions_get` でCI結果を確認する**
- Vercel が push を検知して自動デプロイ

### ローカル経由 (大規模変更のみ)
1. **ブランチ命名**: `claude/<feature-name>`
2. **コミット前**: `npm run typecheck && npm run build` の両方を実行
3. **プレビュー**: pushするとVercelが2〜3分でデプロイ
4. **mainへの反映**: `git merge --squash origin/<branch>` → commit → push

## 現在の状態

### main ブランチ (すべて本番反映済み)
- 5タブ構成 (ホーム/記録/予測/分析/設定)
- ライト/ダーク/自動テーマ切替
- 総資産の先月比表示・記録カード先月比
- 前月コピーで新規記録作成
- CSV月別ダウンロード (各記録カードに📥ボタン)
- 起動時の総資産ちらつき修正 (ロード中は `¥—` 表示)
- 分析グラフに総資産ライン追加
- CI (型チェック + ビルド)
- **プロフィール** (自分の生年 + 子供の名前・生年、複数登録可)
- **ライフプラン・タイムライン**
  - 年カードで自分・子供の年齢とライフステージを自動表示
  - 年ごとに「基本の投資余力」・想定イベント・メモを編集
  - **実際の積立額 = 基本の投資余力 + 収入イベント − 支出イベント** (マイナスなら0)
    - この値が予測グラフに使われる (`calcYearAmounts` / `lifePlanToPhases`)
    - 初期値は全年で同じ (設定タブの投資基本額+追加額)。
      年ごとの変動はイベントが担うため、ここでライフステージ別の値を入れると
      保育料などが二重に差し引かれる
  - Gemini APIで年別収支イベントを提案 (`suggestLifeEvents`)
  - プロフィールから30年分の初期値を自動生成
  - デフォルト10年表示、「さらに10年分」で拡張
- ホーム画面の戦略カードに年齢チップ

### 未マージのブランチ
なし (すべて反映済み)

## 環境変数
- `VITE_GEMINI_API_KEY` または `GEMINI_API_KEY` — Gemini API key
  - `vite.config.ts` がビルド時に `process.env.API_KEY` へ注入する
  - Vercelの環境変数で設定済み
- Supabase接続情報 — `dataService.ts` で参照

## データの保存先

### Supabase (端末をまたいで同期)
| テーブル | 内容 |
|---|---|
| `monthly_records` | 月次記録 |
| `app_settings` | key-value形式。`profile` / `lifeplan` / `config` の3キー |

`supabase/setup.sql` に両テーブルの定義とRLSポリシーをまとめてある。
画面から手で変更したら、このファイルにも必ず反映すること (実態とズレると再構築できなくなる)。

**現状のRLS**: 両テーブルともRLS有効。anonロールに全操作を許可 (単一ユーザー前提)。
配布時は認証を入れて `USING (auth.uid() = user_id)` に書き換える必要がある。

### localStorage
| Key | 用途 | 同期 |
|---|---|---|
| `assetflow_config_v1` | 財務パラメータ | クラウドのキャッシュ |
| `lifefree_profile_v1` | プロフィール | クラウドのキャッシュ |
| `lifefree_lifeplan_v1` | ライフプラン | クラウドのキャッシュ |
| `lifefree_theme_v1` | テーマ | **端末ごと (意図的)** |
| `assetflow_sim_cases_v1` | シミュレーターの保存ケース | 端末ごと (未対応) |

### 同期の設計 (App.tsx)
1. 起動時、まずlocalStorageの値で描画 → その後クラウドの値で上書き
2. クラウドが空でlocalStorageに値があれば、クラウドへ引き上げる (移行)
3. 変更は800msまとめてからクラウドへ送る (`useCloudSync`)
4. **読み込み直後の1回は保存をスキップする** — データを持たない端末の初期値で
   クラウドを上書きし、他端末の実データを消すのを防ぐため
5. クラウドに繋がらなくてもlocalStorageで動作し続ける

## 今後の方針

### iOSリリース (中期目標)
- PWA化 (manifest.json + Service Worker) → Capacitor or React Native
- iOS Safe Area 完全対応
- ホーム画面追加の誘導UI
- プッシュ通知 (月末リマインド)
- App Store 対策

### note記事の自動生成 (2026-08 追加)

記録タブの各月カードの📝ボタンから、資産公開記事の下書きを作れる。

- **金額はコードで埋める** (`noteArticleService.ts`)。AIには一切数字を書かせない
  — 桁の取り違えや勝手な丸めが起きると、公開記事として致命的になるため
- AIが書くのは地の文だけ (`generateNoteCommentary`)。
  プロンプトで「金額の数字は書かない」と明示している
- 冒頭の自己紹介は設定タブの「note記事のプロフィール」から。
  年齢・家族の人数はプロフィール欄から自動計算するので二重入力しない
- note には投稿用の公開APIが無い (2026年4月時点、公開予定も未定)。
  非公式APIはアカウント停止リスクがあるため使わない。コピーして手で貼る運用

### 直近の候補タスク
- [ ] ホーム画面にライフプラン概観カード (今年のフェーズ・今月の目標積立額)
- [ ] AIアドバイスにライフプラン文脈を注入 (現在は月次データのみ参照)
- [ ] PWA対応 — iOS化の第一歩
- [ ] バンドルサイズ削減 (現在1.1MB / gzip 296KB。rechartsが重い)

## コーディング規約

- **コメント**: 基本書かない。意図が非自明な場合のみ短く1行
- **ダークモード**: `dark:` variants は必ずセットで書く
- **色**: Tailwind の `zinc-*` を基本パレットに (`slate-*` は使わない)
- **型**: 素直に `interface`、`any` は避ける (formDataの一時的な用途のみOK)
- **UI言語**: 日本語、変数名は英語
- **ファイル分離**: サービス層 (services/) にビジネスロジック、UI (components/) は表示に専念

## トーン

親しみやすいがプロフェッショナル。過剰な絵文字・装飾は避ける。「**引き算のデザイン**」哲学。iOSアプリリリースを見据えたユーザー中心の判断を常に優先。

## 参考 (デザインインスピレーション)

- iOS標準アプリ (シンプル、機能明確)
- Monarch Money、Copilot Money (ネットワース系)
- 参考にしない: マネフォME (情報過多)

---

**メンテナンスノート**: 大きな設計変更 (新機能・新タブ・データモデル刷新) の際は、このCLAUDE.md を必ず更新してください。次のセッションが即戦力になります。
