# SEEMORE Slack車案件 自動紐付けGAS

Slack内の車案件スレッドを、車体番号の完全一致だけで自動紐付けするGoogle Apps Scriptです。

ローカルPC、VPS、Python、SQLiteは使いません。Google Apps Script、Slack API、Googleスプレッドシートだけで動きます。毎日03:00にGASトリガーで実行するため、PCを閉じていても処理されます。

初期状態は必ず `DRY_RUN=true` です。最初はSlackへ投稿せず、投稿予定だけを `dry_run_logs` シートへ保存します。

## 対象チャンネル

大親チャンネル:

- `依頼_車案件`

子チャンネル:

- `carmore依頼`
- `オールマシンサービス SEEMORE`

## 仕組み

1. 対象チャンネルのスレッドから `車体番号:`、`車体番号：`、`車台番号:`、`車台番号：` を抽出します。
2. 抽出した車体番号を正規化します。
3. 正規化後の完全一致だけを同一案件として扱います。
4. 最終更新が `LOOKBACK_DAYS` 日以内のスレッドだけ処理します。
5. `依頼_車案件` 内では最古スレッドを大親にします。
6. 子チャンネル内では最古スレッドを代表にします。
7. 大親には各子チャンネルの代表スレッドだけを貼ります。
8. 同一チャンネル内の重複は、代表スレッドへ重複スレッドURLを貼ります。
9. 履歴シートとSlack投稿先スレッド本文の両方で同じURLを確認し、二重投稿を防ぎます。

部分一致、類似一致、AI推測はしません。誤投稿より未投稿を優先します。

## 必要なSlack Bot Scopes

Slack AppのBot Token Scopesに以下を追加してください。

```text
channels:read
channels:history
groups:read
groups:history
chat:write
search:read
```

プライベートチャンネルを対象にする場合は、Botを対象チャンネルへ招待してください。

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

## Slack App作成手順

1. [Slack API Apps](https://api.slack.com/apps) を開きます。
2. `Create New App` を選びます。
3. `From scratch` を選び、任意のApp名とWorkspaceを指定します。
4. `OAuth & Permissions` を開きます。
5. `Bot Token Scopes` に必要Scopesを追加します。
6. `Install to Workspace` を実行します。
7. `Bot User OAuth Token` の `xoxb-...` を控えます。

## Botをチャンネルへ招待

Slackの各対象チャンネルで以下を実行します。

```text
/invite @Bot名
```

対象:

- `依頼_車案件`
- `carmore依頼`
- `オールマシンサービス SEEMORE`

## Google Apps Script作成

1. [Google Apps Script](https://script.google.com/) を開きます。
2. 新しいプロジェクトを作成します。
3. `Code.gs` にこのフォルダの `Code.gs` の内容を配置します。
4. プロジェクト設定で `appsscript.json` を表示できるようにした場合、このフォルダの `appsscript.json` も配置します。
5. プロジェクトのタイムゾーンが `Asia/Tokyo` になっていることを確認します。

## setup()実行

Apps Scriptの関数選択で `setup` を選び、実行します。

初回だけGoogleの認証ポップアップが出ます。内容を確認し、許可してください。

`setup()` は以下を自動で行います。

- スプレッドシート `SEEMORE_Slack車案件リンク管理` の作成
- `settings`、`linked_threads`、`run_logs`、`errors`、`dry_run_logs` シートの作成
- ヘッダー行の作成
- `settings` 初期値の作成
- 毎日03:00に `main()` を実行するトリガーの作成

## settingsシート

`.env` は使いません。設定はスプレッドシートの `settings` シートで管理します。

| key | 初期値 | 説明 |
| --- | --- | --- |
| `SLACK_BOT_TOKEN` | 空 | ユーザー様が `xoxb-...` を入力します。Script Propertiesにも同期されます。 |
| `TEAM_DOMAIN` | 空 | 任意の控えです。処理には必須ではありません。 |
| `PARENT_CHANNEL_NAME` | `依頼_車案件` | 大親チャンネル名です。 |
| `CHILD_CHANNEL_NAMES` | `carmore依頼,オールマシンサービス SEEMORE` | 子チャンネル名をカンマ区切りで指定します。 |
| `LOOKBACK_DAYS` | `60` | 最終更新がこの日数以内のスレッドだけ処理します。 |
| `DRY_RUN` | `true` | `true` の間はSlackへ投稿しません。 |

## テスト関数

Apps Script上で以下を実行できます。

| 関数 | 内容 |
| --- | --- |
| `testExtractVins()` | 車体番号抽出と正規化の簡易テストを実行します。 |
| `testSlackAuth()` | Slack API認証が通るか確認します。 |
| `testFindChannels()` | 対象3チャンネルのIDが取得できるか確認します。 |
| `testDryRunOnce()` | `DRY_RUN=true` 相当で1回処理し、投稿予定を `dry_run_logs` に保存します。 |

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

以降、毎日03:00の `main()` 実行でSlackへ投稿します。

手動で本番実行する場合は `main()` を実行します。`runProduction()` は `DRY_RUN=false` になっていない場合は停止します。

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

## 安全ルール

以下の場合は投稿しません。

- 車体番号が取得できない
- 大親が決定できない場合の子チャンネルから大親への投稿
- 作成日時が不明
- permalink取得失敗
- Slack APIエラー
- 子チャンネル以外の検索結果
- 同じURLが既に投稿先スレッドにある
- `linked_threads` に同じ組み合わせがある
- `DRY_RUN=true`

## トリガー確認

Apps Script左メニューの `トリガー` で、`main` が毎日03:00に設定されていることを確認します。

作り直したい場合は `createDailyTrigger()` を実行します。既存の `main()` トリガーを消してから作り直します。

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
- Slack検索の結果はSlack側の権限とインデックスに依存します。
- `LOOKBACK_DAYS` を広げるとGASの実行時間が長くなります。
- 同じURLは履歴シートとSlack本文の両方で確認するため、二重投稿は避けます。
