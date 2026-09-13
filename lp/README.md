# LP（教育費のピーク診断）

`index.html` 1枚だけ。ビルド不要・依存なし。本体アプリとは完全に独立している。

## 公開するまで

### 1. Formspree のフォームIDを入れる

1. https://formspree.io/ に登録（無料枠：月50件）
2. 新規フォームを作ると `https://formspree.io/f/xxxxxxxx` が発行される
3. `index.html` の `action="https://formspree.io/f/YOUR_FORM_ID"` を差し替える

**ここを直さないと登録が1件も届かない。** 公開前に必ず確認する。

送信されるのは3項目:

| name | 内容 |
|---|---|
| `email` | メールアドレス |
| `worry` | いま一番知りたいこと（任意・自由記述） |
| `diagnosis` | その人が画面で出した診断結果（自動で入る） |

`diagnosis` が効く。**「どういう家族構成の人が、どんな結果を見て登録したか」**が
1件ごとに分かるので、n=3でも中身を読める。

### 2. Netlify Drop に置く

https://app.netlify.com/drop に `lp` フォルダごとドラッグする。
アカウント不要で即URLが出る。差し替えも同じ操作。

## 中身

- 診断ロジックは `index.html` 末尾の `<script>` 内で完結（外部通信なし）
- 金額の根拠と前提は [`../docs/app-concept.md`](../docs/app-concept.md)
- 誰に何を言うかは [`../docs/positioning.md`](../docs/positioning.md)

このLPの診断部分は、そのままアプリ本体の「① 診断」のプロトタイプ。
反応があればこのロジックを `services/` に移す。捨てる作業にはならない。

## 数字を触るとき

教育費の基準値は `COST` オブジェクトに集約してある。
ここを変えたら `docs/app-concept.md` の表も必ず一緒に直すこと（ズレると根拠を説明できなくなる）。
