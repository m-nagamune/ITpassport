# 引き渡し資料（HANDOFF）

このプロジェクトを引き継ぐ人・AIエージェント向けの要約です。

## これは何か

ITパスポート試験の学習アプリ。**ビルド不要で動く単一HTML**（`public/index.html`）が成果物。
フレームワークなし、外部CDNなし、npm依存なし。`public/index.html` をブラウザで開けば動きます。

- リポジトリ: https://github.com/m-nagamune/ITpassport （public）
- 本番URL: 未デプロイ（静的ホスティングに置けばそのまま動きます）

## 最初にやること

```bash
git clone https://github.com/m-nagamune/ITpassport.git
cd ITpassport/public
python3 -m http.server 3000     # または npx http-server public -p 3000
# → http://localhost:3000/index.html
```

npm install は不要です。

## ディレクトリ構成

```
parts/                 ソース（この順に結合される）
  01-css-base.html     基本CSS・CSS変数・レイアウト
  02-css-ui.html       コンポーネントCSS
  03-body.html         body骨格（#view / #tabbar / #modal / #toast）
  04〜06-data-*.js     問題データ（ストラテジ35 / マネジメント40 / テクノロジ57）
  07-data-terms.js     用語カード86枚
  08-core.js           状態管理・localStorage・集計・ルーティング・VIEWS/ACTレジストリ
  09-views-core.js     ホーム・演習・出題・結果
  10-views-analysis.js 分析・履歴（SVGグラフは自前実装）
  11-views-roadmap.js  ロードマップ・用語カード
  12-views-manage.js   設定・問題管理・一括追加・JSON入出力
  13-boot.js           render()・キーボード操作・起動
build.sh               parts/* → public/index.html に結合
public/index.html      成果物（コミット対象。手で編集しない）
test/                  Playwright によるE2E
```

## ビルドとテスト

```bash
bash build.sh                  # parts/* を結合 → public/index.html
node test/e2e.js               # 基本機能 16チェック
node test/e2e-ask2.js          # 「わからない」＋問題追加 40チェック
node test/verify-plan.js       # ロードマップの苦手分野ウェイト検証
```

テストは `http://localhost:3000` が起動している前提です。Playwright は sandbox 同梱の
`playwright-core` を絶対パスで require しています。別環境では `npm i -D playwright` に読み替えてください。

**`public/index.html` を直接編集しないこと。** `parts/` を直して `bash build.sh` を実行します。

## 設計上の重要な決定

### 「わからない」ボタン

4択を強制すると当てずっぽうの正解が混ざり正答率が実力より高く出るため、未解答を記録する手段を用意しています。

- `answers[i] = {qid, pick:null, ok:false, unsure:true, ts}` で保存
- **正答率の分母には含める / 分子には入れない**（`rate = correct / count`）
- `weakQuestions()` は `ok===false` を見るので、自動的に復習対象に入る
- 通常演習・復習では解答後にロック、模擬試験ではロックしない（戻って変更可）
- 判定は `isUnsure(a)`（`08-core.js`）に集約。`unsure` フラグ or `pick==null && !ok`

### 状態と永続化

- localStorage キー `itp_notebook_v1`、`DEFAULT_STATE` を `deepFill()` でマージ（スキーマ追加時も既存データを壊さない）
- `save(now)` は既定で250msデバウンス、確定時は `save(true)`
- 問題は「組み込み（parts内）＋ `ST.custom` ＋ `ST.edits`（上書き）− `ST.hidden`（非表示）」を
  `allQuestions()` が合成。問題を追加するときはこの経路に乗せる

### UIの仕組み

- ハッシュルーティング（`#/home` `#/quiz` `#/result/<id>` など）
- `VIEWS.<route>()` が `{html, after}` を返し、`render()` が `#view` に流し込む
- 画面内の操作は `data-act="..."` 属性 → `ACT` レジストリの委譲クリックで処理
- グラフは外部ライブラリを使わず SVG を手組み（オフライン要件のため）

## 未対応・既知の制約

- 収録問題は**サンプル**。「過去問ベース」も公表問題の論点を参考に再構成したもので、出題文そのものではない
- 学習データは**ブラウザの localStorage のみ**。端末をまたぐ同期はない（JSON書き出し／読み込みで代替）
- サーバーサイドなし。マルチユーザー・ランキング・クラウド保存は未実装
- 問題の一括追加は「貼り付け／JSON」。CSV・Excelの直接取り込みは未対応
- アクセシビリティは部分対応（フォーカス移動・キーボード操作あり、スクリーンリーダー検証は未実施）

## 次にやるとよさそうなこと

1. 静的ホスティングへのデプロイ（Cloudflare Pages 等）→ URLで配布
2. 収録問題の拡充（`parts/04〜06` に追記、またはアプリ内の一括追加）
3. CSV/Excel → JSON の変換スクリプト
4. localStorage から外部DBへの移行（複数端末対応する場合）

## 触る際の注意

- `parts/` の13ファイルは**結合順に意味がある**（CSSが先、`08-core.js` が `VIEWS`/`ACT` を定義してから各ビュー）
- `09-views-core.js` の `VIEWS.quiz` は1関数が大きい。フッターや解説の分岐を触るときは
  `locked` / `isExam` / `isUnsure` の3状態を必ず確認する
- レイアウトは 900px / 700px / 620px / 560px にブレークポイントがある。モバイルで
  横スクロールが出ていないか（`scrollWidth - clientWidth`）を毎回確認する
