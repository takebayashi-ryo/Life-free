# GitHubへのプッシュ方法（初心者向け）

## 前提条件
- Gitがインストールされていること
- GitHubアカウントを持っていること

---

## ステップ1: Gitリポジトリを初期化

ターミナルでプロジェクトのフォルダに移動して、以下を実行：

```bash
cd /Users/takebayashiryo/Downloads/life-free
git init
```

これで、Gitリポジトリが初期化されます。

---

## ステップ2: ファイルをステージング（追加）

変更をGitに登録するために、ファイルをステージングします：

```bash
git add .
```

これで、`.gitignore`で除外されたファイル以外のすべてのファイルが追加されます。

---

## ステップ3: 初回コミット

変更をコミット（保存）します：

```bash
git commit -m "Initial commit: AssetFlow app with Supabase integration"
```

`-m`の後の文字列はコミットメッセージ（変更内容の説明）です。好きなメッセージに変更してもOKです。

---

## ステップ4: GitHubでリポジトリを作成

1. **GitHubにログイン**
   - https://github.com にアクセス
   - ログインする

2. **新しいリポジトリを作成**
   - 右上の「+」アイコンをクリック
   - 「New repository」を選択

3. **リポジトリの設定**
   - **Repository name**: `life-free`（好きな名前でOK）
   - **Description**: 説明（任意）
   - **Public / Private**: 公開範囲を選択
   - **重要**: 「Initialize this repository with a README」のチェックは**外す**（既にファイルがあるため）
   - 「Create repository」をクリック

4. **リモートリポジトリのURLをコピー**
   - 作成後、表示されるページで「HTTPS」のURLをコピー
   - 例: `https://github.com/your-username/life-free.git`

---

## ステップ5: リモートリポジトリを追加

ローカルのリポジトリをGitHubのリポジトリと接続します：

```bash
git remote add origin https://github.com/your-username/life-free.git
```

**注意**: `your-username`を実際のGitHubユーザー名に置き換えてください。

---

## ステップ6: ブランチ名を確認・変更（必要に応じて）

現在のブランチ名を確認：

```bash
git branch
```

`main`ブランチでない場合（`master`など）、`main`に変更：

```bash
git branch -M main
```

---

## ステップ7: GitHubにプッシュ

GitHubにコードをアップロードします：

```bash
git push -u origin main
```

初回のプッシュ時は、GitHubのユーザー名とパスワード（Personal Access Token）の入力が求められる場合があります。

---

## 認証について

### Personal Access Token（PAT）の作成が必要な場合

GitHubでは、2021年8月以降、パスワードでの認証が廃止され、Personal Access Token（PAT）の使用が必要です。

1. **GitHubでPATを作成**
   - GitHub右上のアイコンをクリック → 「Settings」
   - 左メニューから「Developer settings」
   - 「Personal access tokens」→ 「Tokens (classic)」
   - 「Generate new token」→ 「Generate new token (classic)」
   - **Note**: 説明（例: "life-free"）
   - **Expiration**: 有効期限を選択
   - **Scopes**: `repo`にチェック
   - 「Generate token」をクリック
   - **重要**: 表示されたトークンをコピー（二度と表示されません）

2. **プッシュ時に使用**
   - ユーザー名: GitHubのユーザー名
   - パスワード: コピーしたPersonal Access Token

---

## 完了！

プッシュが成功すると、GitHubでコードが確認できます。

---

## トラブルシューティング

### エラー: "remote origin already exists"
リモートリポジトリが既に追加されている場合：
```bash
git remote remove origin
git remote add origin https://github.com/your-username/life-free.git
```

### エラー: "Permission denied"
- GitHubのユーザー名とPersonal Access Tokenが正しいか確認
- SSHキーを使用する場合: `git remote set-url origin git@github.com:your-username/life-free.git`

### エラー: "Failed to push some refs"
GitHubのリポジトリが既にファイルを含んでいる場合（READMEなど）:
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```
