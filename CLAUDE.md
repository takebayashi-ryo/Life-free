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
| ホーム | 総資産・先月比・現金目標・最近の記録・戦略フェーズ・プロフィール文脈 |
| 記録 | 月次レポート一覧・CSVエクスポート(月単位)・前月コピー |
| 予測 | ライフプラン・タイムライン → 資産推移予測グラフ |
| 分析 | 資産推移グラフ(総資産/現金/投資/月次投資)・AI質問応答 |
| 設定 | プロフィール(自分+子供)・テーマ・マスキング・財務パラメータ |

## 技術スタック

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** (CDN経由、`darkMode: 'class'`)
- **Recharts** (グラフ)
- **Supabase** (月次レコード永続化)
- **Google Gemini API** (`process.env.API_KEY`) — アドバイス・質問応答・年別イベント提案
- **Vercel** (ホスティング・自動CI/CD)

## ファイル構成

```
App.tsx                     # メインコンポーネント・全タブのルーター兼状態管理
types.ts                    # 型定義 (FinancialConfig, MonthlyRecord, UserProfile, LifePlan...)
services/
  dataService.ts            # Supabase records CRUD
  simulationService.ts      # 複利計算 (SimulationPhase[] 対応)
  lifePlanService.ts        # LifePlan生成・SimulationPhaseへの変換
  geminiService.ts          # AI (アドバイス・質問応答・年別イベント提案)
components/
  MonthEditor.tsx           # 月次記録の追加/編集モーダル
  AnalysisChart.tsx         # 資産推移グラフ (分析タブ用)
  Simulator.tsx             # 予測タブ全体 (LifePlanTimelineを内包)
  LifePlanTimeline.tsx      # ライフプラン年カードのUI
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

## 開発ワークフロー

### 優先: GitHub MCP経由での直接編集 (推奨)
- 小〜中規模の変更: `mcp__github__create_or_update_file` / `push_files` で直接リモート書き換え
- 状態同期のブレを防ぐ (以前ローカル/リモートが食い違ってトラブルあり)
- Vercel が push を検知して自動デプロイ

### ローカル経由 (大規模変更のみ)
1. **ブランチ命名**: `claude/<feature-name>` (例: `claude/lifeplan-timeline`)
2. **コミット前**: `npm run build` で型・依存エラーチェック必須
3. **プレビュー**: pushするとVercelが2〜3分でデプロイ
4. **mainへの反映**: `git merge --squash <branch>` → commit → push

## 現在の状態 (最新)

### main ブランチ (本番反映済み)
- 5タブ構成 (ホーム/記録/予測/分析/設定)
- ライト/ダーク/自動テーマ切替
- 総資産の先月比表示・記録カード先月比
- 前月コピーで新規記録作成
- CSV月別ダウンロード (各記録カードに📥ボタン)
- 起動時の総資産ちらつき修正 (ロード中は `¥—` 表示)
- プロフィール (自分の生年 + 子供の名前・生年 複数登録可)
- 分析グラフに総資産ライン追加
- ヘッダー簡素化、シミュタブ→「予測」に改名

### 未マージのブランチ
- **`claude/lifeplan-timeline`** ← ライフプラン・タイムライン機能
  - 年カードで自分・子供の年齢自動表示
  - Gemini APIによる年別収支イベント提案 (`suggestLifeEvents`)
  - 月積立額・メモ・イベントを年ごとに編集
  - 予測タブ全体のUXを刷新 (旧phases UI廃止)
  - 動作確認後にmainマージ予定

## 環境変数
- `API_KEY` — Gemini API key (Vercel環境変数で設定済み)
- Supabase接続情報 — `dataService.ts` で参照

## localStorage キー
| Key | 用途 |
|---|---|
| `assetflow_config_v1` | 財務パラメータ (給与、保育料等) |
| `assetflow_sim_cases_v1` | シミュレーターの保存ケース |
| `lifefree_theme_v1` | テーマ (light/dark/auto) |
| `lifefree_profile_v1` | ユーザープロフィール |
| `lifefree_lifeplan_v1` | ライフプランデータ |
| `lifefree_sim_phases_v1` | (旧) ライフステージphases — timeline導入後は使用停止予定 |
| `lifefree_sim_use_phases_v1` | (旧) 同上 |

## 今後の方針

### iOSリリース (中期目標)
- Capacitor or React Native への移植、または PWA化
- iOS Safe Area 完全対応
- ホーム画面追加の誘導UI
- プッシュ通知 (月末リマインド)
- App Store 対策

### 直近の優先タスク
- [ ] `claude/lifeplan-timeline` の動作確認 → mainマージ
- [ ] ホーム画面にライフプラン概観カード追加 (今年のフェーズ・今月の目標額)
- [ ] AIアドバイスにライフプラン情報を含める (現在は月次単位のみ)
- [ ] PR自動監視ワークフローの検討 (`subscribe_pr_activity`)

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
