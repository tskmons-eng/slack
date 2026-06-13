# SEEMORE Slack車案件 自動紐付けGAS

Slack内の車案件スレッドを、車体番号またはスレIDの完全一致で自動紐付けするGoogle Apps Scriptです。

ローカルPC、VPS、Python、SQLiteは使いません。Google Apps Script、Slack API、Googleスプレッドシートだけで動きます。GASトリガーで1時間ごとに実行するため、PCを閉じていても処理されます。

初期状態は必ず `DRY_RUN=true` です。最初はSlackへ投稿せず、投稿予定だけを `dry_run_logs` シートへ保存します。

## 対象チャンネル

大親チャンネル:

- `依頼_車案件`

子チャンネル:

- `carmore依頼`
- `オールマシンサービス`

## 仕組み

1. 対象チャンネルのスレッドから `車体番号:`、`車台番号:`、`スレID:` を抽出します。
2. `:` / `：`、全角英数字、大文字小文字、空白ゆれを正規化します。
3. 正規化後の車体番号またはスレIDの完全一致だけを同一案件として扱います。
4. 最終更新が `LOOKBACK_DAYS` 日以内のスレッドだけ処理します。
5. `依頼_車案件` 内では最古スレッドを大親にします。
6. 子チャンネル内では最古スレッドを代表にします。
7. 大親には各子チャンネルの代表スレッドだけを貼ります。
8. 同一チャンネル内の重複は、代表スレッドへ重複スレッドURLを貼ります。
9. 履歴シートとSlack投稿先スレッド本文の両方で同じURLを確認し、二重投稿を防ぎます。

部分一致、類似一致、AI推測はしません。誤投稿より未投稿を優先します。

`スレID` の値は英数字、日本語、全角文字が混ざってもよい前提です。比較時はNFKC正規化、大文字化、空白除去を行います。

## 請求書ロケット転送

`INVOICE_SOURCE_CHANNEL_NAMES` で指定した監視元の投稿または返信に指定リアクション `rocket` が付いている場合、`依頼＿請求書` へ転送します。初期値は `*` で、Botが参加している全チャンネルを監視します。ただし転送先の `依頼＿請求書` 自身は監視対象から除外します。PDFファイルがある場合は以下の形式で投稿します。

```text
【ファイル名 2026-06-12】
<元投稿のSlackリンク>
```

PDFファイルがない場合は、元投稿のSlackリンクだけを投稿します。転送済みは `invoice_reaction_posts` シートに保存し、PDFありは同じ投稿、同じPDF、同じリアクション、PDFなしは同じ投稿、同じリアクションでは再投稿しません。

Bot投稿ではSlack内部リンクが手動共有と同じネイティブプレビューにならないことがあるため、投稿本文のURLはリンクラベル化し、元投稿を開けるカードを添付します。既存の請求書転送投稿は `?action=refresh_invoice_previews&confirm=RUN_INVOICE_FORWARD` で同じ形式に更新できます。

チャンネルごとの最終確認状態は `invoice_channel_scan_state` シートに保存します。通常は直近の最新投稿が前回スキャン時から変わったチャンネルだけを深く確認し、新着がないチャンネルはスキップします。リアクションが古い投稿へ後付けされた場合に備え、`INVOICE_FORCE_RESCAN_HOURS` 時間を過ぎたチャンネルは新着がなくても再スキャンします。

スタンプが押された瞬間に転送するにはSlack Events APIの `reaction_added` イベントをGASの `doPost` で受ける構成が必要です。現在の実装はポーリング方式の改善版です。

## 必要なSlack Bot Scopes

Slack AppのBot Token Scopesに以下を追加してください。

```text
channels:read
channels:history
groups:read
groups:history
reactions:read
files:read
chat:write
```

プライベートチャンネルを対象にする場合は、Botを対象チャンネルへ招待してください。
`search.messages` はBot Tokenでは使わず、Botが参加している対象チャンネルの履歴を `LOOKBACK_DAYS` の範囲で走査します。

## ユーザー様が行う作業

1. Slack Appを作成する。
2. 上記ScopesをBot Token Scopesへ追加する。
3. WorkspaceへAppをインストールし、`xoxb-` で始まるBot Tokenを取得する。
4. 対象チャンネルにBotを招待する。
5. Google Apps Scriptプロジェクトを作成する。
6. `Code.gs` の内容をApps Scriptへ配置する。
7. 必要なら `appsscript.json` をApps Scriptのマニフェストへ配置する。
8. Apps Scriptで `setup()` を一度実行し、Google認証ポップアップを許可する。
9. 作成されたスプレッドシートの `settings` シートへ `SLACK_BOT_TOKEN` を入力する。
10. `testSlackAuth()`、`testFindChannels()`、`testDryRunOnce()` を実行して確認する。
11. `dry_run_logs` を確認し、問題なければ `settings` シートの `DRY_RUN` を `false` にする。

Codexから `clasp` で配置する場合は、GASをWebアプリとしてデプロイし、`/exec?action=setup` を開いて `setup()` を実行できます。Webアプリ設定は `MYSELF` / `USER_DEPLOYING` のため、デプロイしたGoogleユーザー本人だけが実行できます。

## Slack App作成手順

1. [Slack API Apps](https://api.slack.com/apps) を開きます。
2. `Create New App` を選びます。
3. `From an app manifest` を選びます。
4. Workspaceを選びます。
5. このフォルダの `slack-app-manifest.yml` の内容を貼り付けます。
6. 内容を確認してAppを作成します。
7. `Install to Workspace` を実行します。
8. `OAuth & Permissions` で `Bot User OAuth Token` の `xoxb-...` を控えます。

## Botをチャンネルへ招待

Slackの各対象チャンネルで以下を実行します。

```text
/invite @Bot名
```

対象:

- `依頼_車案件`
- `carmore依頼`
- `オールマシンサービス`
- `依頼＿ALL`
- `依頼＿請求書`
- その他、請求書ロケット監視元にしたいチャンネル

## Google Apps Script作成

1. [Google Apps Script](https://script.google.com/) を開きます。
2. 新しいプロジェクトを作成します。
3. `Code.gs` にこのフォルダの `Code.gs` の内容を配置します。
4. プロジェクト設定で `appsscript.json` を表示できるようにした場合、このフォルダの `appsscript.json` も配置します。
5. プロジェクトのタイムゾーンが `Asia/Tokyo` になっていることを確認します。

## setup()実行

Apps Scriptの関数選択で `setup` を選び、実行します。

初回だけGoogleの認証ポップアップが出ます。内容を確認し、許可してください。

`clasp` デプロイ済みの場合は、WebアプリURLの末尾に `?action=setup` を付けて開いても同じセットアップが実行されます。

セットアップ後の状態確認は、同じWebアプリURLの末尾を `?action=status` にして開きます。スプレッドシート、シートヘッダー、`settings` 初期値、`scheduledMain()` トリガー有無をJSONで確認できます。

Slack Bot Tokenは、同じWebアプリURLの末尾を `?action=slack` にして開くと保存できます。保存後に `testSlackAuth()` と `testFindChannels()` 相当の疎通確認を実行します。

デプロイ後の追加確認は、本人限定WebアプリURLで `?action=test_slack`、`?action=test_logic`、`?action=dryrun` を開いて実行できます。`test_logic` は実Slackへ投稿せず、親子判定、代表スレッド選定、重複アクション、部分一致除外、スレID正規化を合成データで確認します。`dryrun` は `DRY_RUN=true` のまま投稿予定を `dry_run_logs` に保存します。短時間検証では `?action=dryrun&lookback_days=7&max_threads_per_channel=5` のように走査範囲と各チャンネルの確認件数を一時上書きできます。

`setup()` は以下を自動で行います。

- スプレッドシート `SEEMORE_Slack車案件リンク管理` の作成
- `settings`、`linked_threads`、`run_logs`、`errors`、`dry_run_logs`、`invoice_reaction_posts` シートの作成
- ヘッダー行の作成
- `settings` 初期値の作成
- 1時間ごとに `scheduledMain()` を実行するトリガーの作成

## settingsシート

`.env` は使いません。設定はスプレッドシートの `settings` シートで管理します。

| key | 初期値 | 説明 |
| --- | --- | --- |
| `SLACK_BOT_TOKEN` | 空 | ユーザー様が `xoxb-...` を入力します。Script Propertiesにも同期されます。 |
| `TEAM_DOMAIN` | 空 | 任意の控えです。処理には必須ではありません。 |
| `PARENT_CHANNEL_NAME` | `依頼_車案件` | 大親チャンネル名です。 |
| `CHILD_CHANNEL_NAMES` | `carmore依頼,オールマシンサービス` | 子チャンネル名をカンマ区切りで指定します。 |
| `LOOKBACK_DAYS` | `60` | 最終更新がこの日数以内のスレッドだけ処理します。 |
| `DRY_RUN` | `true` | `true` の間は車案件の自動紐付けをSlackへ投稿しません。 |
| `MAIN_TRIGGER_HOURS` | `3,10,13,16,20` | `MAIN_TRIGGER_INTERVAL_HOURS` を空にした場合だけ使う日次実行時刻です。 |
| `MAIN_TRIGGER_INTERVAL_HOURS` | `1` | `scheduledMain()` を何時間ごとに実行するかです。`1` なら1時間ごとです。空にすると `MAIN_TRIGGER_HOURS` を使います。 |
| `INVOICE_FORWARD_ENABLED` | `true` | ロケットリアクション付き投稿の請求書転送を有効にします。 |
| `INVOICE_SOURCE_CHANNEL_NAME` | `依頼＿ALL` | 旧設定です。`INVOICE_SOURCE_CHANNEL_NAMES` が空の場合だけ使う単一監視元です。 |
| `INVOICE_SOURCE_CHANNEL_NAMES` | `*` | ロケットリアクションを確認するチャンネル名です。`*` はBot参加済み全チャンネル、個別指定はカンマ区切りです。 |
| `INVOICE_TARGET_CHANNEL_NAME` | `依頼＿請求書` | 請求書転送先チャンネル名です。 |
| `INVOICE_REACTION_NAME` | `rocket` | 転送条件にするSlack絵文字名です。 |
| `INVOICE_LOOKBACK_DAYS` | `7` | 請求書転送で直近何日分を見るかです。 |
| `INVOICE_HISTORY_LIMIT` | `50` | 請求書転送で1回に確認する投稿数です。 |
| `INVOICE_REPLY_THREAD_LIMIT` | `10` | 請求書転送で返信を確認するrootスレッド数の上限です。 |
| `INVOICE_FORCE_RESCAN_HOURS` | `6` | 新着がないチャンネルでも、後付けリアクション検知のために再スキャンする間隔です。 |
| `INVOICE_FORWARD_DRY_RUN` | `false` | `true` にすると請求書転送も投稿せず候補数だけ確認します。 |

## テスト関数

Apps Script上で以下を実行できます。

| 関数 | 内容 |
| --- | --- |
| `testExtractVins()` | 車体番号抽出と正規化の簡易テストを実行します。 |
| `testExtractLinkKeys()` | 車体番号とスレIDの抽出、全角半角、大文字小文字、空白除去の正規化を確認します。 |
| `testResolveVinGroups()` | 合成データで親子判定、代表選定、部分一致除外、スレID紐付けを確認します。 |
| `testSlackAuth()` | Slack API認証が通るか確認します。 |
| `testFindChannels()` | 対象3チャンネルのIDが取得できるか確認します。 |
| `listJoinedChannelsForInvoice_()` | Botが参加しているチャンネルと、請求書ロケット監視候補を確認します。 |
| `testDryRunOnce()` | `DRY_RUN=true` 相当で1回処理し、投稿予定を `dry_run_logs` に保存します。 |

`clasp run` が環境都合で使えない場合は、WebアプリURLの `?action=test_slack`、`?action=test_logic`、`?action=dryrun` で同じ確認を実行できます。検証時間を抑える場合は `?action=dryrun&lookback_days=7&max_threads_per_channel=5` を使います。

## Web診断アクション

本人限定WebアプリURLでは、通常の `dryrun` が広範囲走査で時間上限に近い場合に備え、以下の診断アクションも使えます。

- `?action=scan_labels&channel_role=parent&lookback_days=365&max_threads_per_channel=300`
  - 指定ロールのチャンネルを走査し、`車体番号:` / `車台番号:` / `スレID:` ラベルを含むスレッド数と候補を確認します。
- `?action=joined_channels`
  - Botが参加しているチャンネル一覧と、現在の請求書ロケット監視候補を確認します。
- `?action=scan_labels&channel_role=child&channel_name=carmore依頼&lookback_days=365&max_threads_per_channel=120`
  - `channel_name` を指定すると、対象チャンネルだけを診断します。
- `?action=link_threads&source_channel_name=...&source_thread_ts=...&target_thread_ts=...&dry_run=true`
  - 既知の子スレッドと親スレッドを再読し、両方に共通する車体番号またはスレIDがある場合だけ投稿予定を確認します。
- `?action=link_threads&source_channel_name=...&source_thread_ts=...&target_thread_ts=...&dry_run=false&confirm=RUN_PRODUCTION`
  - 既知ペアを1回だけ本番投稿します。本番投稿には `confirm=RUN_PRODUCTION` が必須です。
- `?action=invoice_dryrun`
  - 請求書ロケット監視元の直近投稿から、ロケットリアクション付きの転送候補を確認します。PDFがない候補はリンクのみとして扱います。Slackへは投稿しません。
- `?action=invoice_run&confirm=RUN_INVOICE_FORWARD`
  - 請求書転送を手動で本番実行します。

重複防止は `linked_threads` のsource/target permalink比較と、投稿先スレッド本文中のURL確認の両方で行います。Slack timestampはGoogle Sheetsで数値化されることがあるため、重複判定の主キーとしてURLも必ず使います。

## DRY_RUN確認

初期状態では `DRY_RUN=true` です。

`testDryRunOnce()` または `main()` を実行すると、Slackへ投稿せず、投稿予定だけが `dry_run_logs` に保存されます。

確認するポイント:

- 投稿先スレッドが正しい
- 投稿元スレッドURLが正しい
- 大親には子チャンネル代表だけが出ている
- 子チャンネル内の重複は代表スレッドへ向いている
- 不要な部分一致が混ざっていない

## 本番化

`dry_run_logs` に問題がない場合だけ、`settings` シートの `DRY_RUN` を `false` に変更します。

以降、1時間ごとの `scheduledMain()` 実行で車案件の紐付けと請求書転送を処理します。

車案件だけを手動で本番実行する場合は `runProduction()` を実行します。`runProduction()` は `DRY_RUN=false` になっていない場合は停止します。

## シート構成

`linked_threads`:

```text
linked_at
vin
relation_type
source_channel_name
source_channel_id
source_thread_ts
source_url
target_channel_name
target_channel_id
target_thread_ts
target_url
posted_text
dry_run
```

`vin` 列は既存互換のため列名を残しています。保存値は `車体番号:ZVW30-1234567` または `スレID:案件ABC123` の形式です。

`relation_type`:

- `same_channel_duplicate`
- `child_to_parent`
- `parent_duplicate`

`run_logs`:

```text
started_at
finished_at
dry_run
parent_threads_checked
vins_found
child_matches_found
posted_count
duplicate_skipped_count
expired_skipped_count
error_count
memo
```

`errors`:

```text
occurred_at
context
error_message
raw_response
```

`dry_run_logs`:

```text
created_at
vin
action_type
target_thread
source_thread
message_preview
reason
```

`invoice_reaction_posts`:

```text
processed_at
source_channel_name
source_channel_id
source_message_ts
source_url
file_id
file_name
reaction_name
target_channel_name
target_channel_id
posted_ts
posted_text
dry_run
```

`invoice_channel_scan_state`:

```text
source_channel_name
source_channel_id
last_checked_at
last_full_scan_at
last_scanned_latest_ts
last_seen_latest_ts
messages_checked
reply_threads_checked
reply_messages_checked
candidates_found
posted_count
planned_count
duplicate_skipped_count
skipped_unchanged
last_error
dry_run
```

## 投稿文

大親へ貼る場合:

```text
関連依頼スレ：

【チャンネル名】
<SlackスレッドURL>
```

同一チャンネル内の代表へ貼る場合:

```text
同一車体番号の関連スレ：

<SlackスレッドURL>
```

請求書チャンネルへ転送する場合:

```text
【PDFファイル名 2026-06-12】
<元投稿のSlackリンク>
```

PDFファイルがない場合:

```text
<元投稿を開く>
```

## 安全ルール

以下の場合は投稿しません。

- 車体番号が取得できない
- スレIDが取得できない
- 大親が決定できない場合の子チャンネルから大親への投稿
- 作成日時が不明
- permalink取得失敗
- Slack APIエラー
- 対象チャンネル以外のスレッド
- 同じURLが既に投稿先スレッドにある
- `linked_threads` に同じ組み合わせがある
- `DRY_RUN=true`

## トリガー確認

Apps Script左メニューの `トリガー` で、`scheduledMain` が毎日03:00、10:00、13:00、16:00、20:00付近に設定されていることを確認します。

作り直したい場合は `createDailyTrigger()` を実行します。既存の `main()` / `scheduledMain()` トリガーを消してから作り直します。

Apps Scriptの時刻トリガーは分単位で厳密には動きません。`nearMinute(0)` を指定しているため、各時刻の0分付近で動く想定です。

## エラー確認

エラーは `errors` シートに保存されます。

よく見る項目:

- `SLACK_BOT_TOKENが未設定です`
- `Slack channel not found or bot is not invited`
- `Slack API error on ...`
- `chat.getPermalinkでURLを取得できませんでした`

## 本番運用時の注意点

- `DRY_RUN=false` にする前に必ず `dry_run_logs` を確認してください。
- Botを対象チャンネルから外すと取得や投稿に失敗します。
- Botが対象チャンネルに参加していない場合、そのチャンネルの履歴取得は失敗します。
- `LOOKBACK_DAYS` を広げるとGASの実行時間が長くなります。
- 同じURLは履歴シートとSlack本文の両方で確認するため、二重投稿は避けます。
