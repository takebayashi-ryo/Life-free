# Supabase接続テスト手順

## 前提条件

1. SupabaseのSQL Editorで `supabase/setup.sql` を実行済み
2. `.env.local` ファイルに環境変数を設定済み：
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. 開発サーバーを起動：`npm run dev`

---

## テスト方法

### 方法1: ブラウザのコンソールから実行（推奨）

1. アプリケーションをブラウザで開く
2. 開発者ツールのコンソールを開く（F12 または Cmd+Option+I）
3. 以下のコマンドを実行：

#### 全テストを実行
```javascript
await window.testSupabase.runAllTests()
```

#### 個別にテストを実行
```javascript
// 環境変数確認
window.testSupabase.testEnvironmentVariables()

// SELECT接続確認
await window.testSupabase.testSelectConnection()

// INSERT接続確認
await window.testSupabase.testInsertConnection()
```

---

### 方法2: App.tsxに一時的に追加（開発用）

`App.tsx` の `useEffect` に一時的にテストコードを追加：

```typescript
import { runAllTests } from './test-supabase';

// Load data on mount
useEffect(() => {
  // テスト実行（開発環境のみ）
  if (import.meta.env.DEV) {
    runAllTests();
  }
  
  // Load records from Supabase
  loadRecords().then(loadedRecords => {
    setRecords(loadedRecords);
  });
  
  // ... 以下既存のコード
}, []);
```

---

## 期待される結果

### テスト1: SELECT接続確認
- ✅ SELECT成功メッセージが表示される
- 取得件数が表示される（初回は0件）
- データが表示される（空配列でもOK）

### テスト2: INSERT接続確認
- ✅ INSERT成功メッセージが表示される
- 追加されたデータが表示される
- 確認用SELECTでデータが取得できる

### エラーの場合

#### 環境変数エラー
```
❌ 環境変数が設定されていません！
```
→ `.env.local` ファイルを確認し、環境変数を設定してください

#### SELECTエラー
```
❌ SELECTエラー: { message: "...", code: "..." }
```
→ エラーメッセージを確認：
- `code: "PGRST116"` → テーブルが存在しない（SQLスクリプトを実行してください）
- `code: "42501"` → RLSポリシーの問題（SQLスクリプトを確認してください）
- `message: "JWT expired"` → APIキーが無効

#### INSERTエラー
```
❌ INSERT失敗: ...
```
→ エラーメッセージを確認：
- `code: "23505"` → 主キー重複（テストIDが既に存在）
- `code: "42501"` → RLSポリシーの問題（INSERTポリシーを確認）

---

## トラブルシューティング

### 1. 環境変数が読み込まれない
- `.env.local` ファイルがプロジェクトルートにあるか確認
- 開発サーバーを再起動：`npm run dev`
- `import.meta.env.VITE_` プレフィックスが付いているか確認

### 2. CORSエラー
- Supabaseダッシュボードで「Settings」→「API」→「CORS origins」に開発サーバーのURL（例：`http://localhost:5173`）を追加

### 3. RLSポリシーエラー
- Supabaseダッシュボードの「Authentication」→「Policies」でポリシーを確認
- SQLスクリプトを再実行

### 4. テーブルが存在しない
- SQL Editorで `supabase/setup.sql` を再実行
- Supabaseダッシュボードの「Table Editor」で `monthly_records` テーブルが存在するか確認
