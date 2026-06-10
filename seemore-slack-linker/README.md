# SEEMORE Slack Linker

Slack 内の車案件スレッドを、車体番号の完全一致だけで自動紐付けする Python ツールです。

親チャンネル `依頼_車案件` のスレッドから車体番号を抽出し、子チャンネル `carmore依頼` と `オールマシンサービス SEEMORE` にある同じ車体番号のスレッドを Slack 検索で探します。見つかった子スレッド URL は、まだ投稿済みでない場合だけ親スレッドへ返信します。

初期状態は必ず `DRY_RUN=true` です。この状態では Slack へ投稿せず、投稿予定内容だけをログに出します。

## 構成

```text
seemore-slack-linker/
├─ app/
│  ├─ main.py
│  ├─ config.py
│  ├─ slack_client.py
│  ├─ vin.py
│  ├─ database.py
│  ├─ linker.py
│  └─ logger.py
├─ data/
├─ logs/
├─ tests/
│  ├─ test_vin.py
│  └─ test_duplicate.py
├─ .env.example
├─ requirements.txt
├─ README.md
└─ run.bat
```

## Slack App 作成

1. Slack API の App 管理画面で新しい App を作成します。
2. Bot User を有効にします。
3. OAuth & Permissions で Bot Token Scopes を設定します。
4. Workspace に App をインストールします。
5. `xoxb-` で始まる Bot User OAuth Token を `.env` の `SLACK_BOT_TOKEN` に設定します。

## 必要 Scopes

```text
channels:read
channels:history
groups:read
groups:history
chat:write
search:read
```

プライベートチャンネルを対象にする場合は、Bot を対象チャンネルへ招待してください。

## Bot をチャンネルへ招待

Slack の対象チャンネルで次を実行します。

```text
/invite @Bot名
```

対象チャンネル:

- `依頼_車案件`
- `carmore依頼`
- `オールマシンサービス SEEMORE`

## セットアップ

Python 3.11 以上を使います。

```powershell
cd C:\Users\tskmo\OneDrive\Desktop\プログラム\slack\seemore-slack-linker
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

`.env` を編集します。

```env
SLACK_BOT_TOKEN=xoxb-xxxxxxxx
SLACK_TEAM_DOMAIN=seemore-talk

PARENT_CHANNEL_NAME=依頼_車案件
CHILD_CHANNEL_NAMES=carmore依頼,オールマシンサービス SEEMORE

LOOKBACK_DAYS=60
DRY_RUN=true

DB_PATH=./data/seemore_slack_links.sqlite3
LOG_LEVEL=INFO
```

## 初回 dry_run 実行

```powershell
.\.venv\Scripts\python.exe -m app.main
```

`DRY_RUN=true` の場合、Slack へ投稿せず、投稿予定内容だけが `logs/seemore_slack_linker.log` に出ます。

## 本番投稿

dry run のログを確認して問題がない場合だけ、`.env` を変更します。

```env
DRY_RUN=false
```

その後、再実行します。

```powershell
.\.venv\Scripts\python.exe -m app.main
```

## 重複投稿防止

次の両方で確認します。

- SQLite DB の `linked_threads` に同じ `parent_channel_id`、`parent_thread_ts`、`child_url` が存在するか
- 親スレッド内に同じ `child_url` が既に含まれているか

どちらかに該当する場合は投稿しません。

## DB 保存

既定値:

```env
DB_PATH=./data/seemore_slack_links.sqlite3
```

Google Drive 同期フォルダに保存する場合:

```env
DB_PATH=G:/マイドライブ/seemore_slack_links.sqlite3
```

指定した DB パスの親フォルダが存在しない場合、ツールはエラーで停止します。別の場所へ勝手に保存しません。

## Windows タスクスケジューラ

毎日 03:00 に実行する設定例です。

1. タスクスケジューラを開く
2. 基本タスクの作成
3. 名前: `SEEMORE Slack Linker`
4. トリガー: 毎日 03:00
5. 操作: プログラムの開始
6. プログラム: `run.bat` のフルパス
7. 開始場所: `seemore-slack-linker` のフルパス
8. 完了

`run.bat` の内容:

```bat
@echo off
cd /d %~dp0
.venv\Scripts\python.exe -m app.main
pause
```

## 車体番号ルール

対応する表記:

```text
車体番号:
車体番号：
車台番号:
車台番号：
```

抽出後は前後空白、全角スペース、改行、末尾の句読点を取り除き、大文字化します。

完全一致のみ有効です。部分一致や AI 判断は使いません。

## ログ確認

```text
logs/seemore_slack_linker.log
```

実行履歴は SQLite の `run_logs` にも保存されます。エラーは `errors` に保存されます。

## テスト

```powershell
.\.venv\Scripts\python.exe -m pytest
```

## トラブルシューティング

- `SLACK_BOT_TOKEN is required.`: `.env` に Bot Token を設定してください。
- `Slack channel not found or bot is not invited`: チャンネル名、Bot 招待、Scope を確認してください。
- `DB_PATH parent folder does not exist`: `.env` の `DB_PATH` の親フォルダを作成するか、正しいパスに変更してください。
- Slack 検索エラー: `search:read` Scope と Slack 側の検索権限を確認してください。
- 投稿されない: `DRY_RUN=true`、DB 重複、親スレッド内の既存 URL、対象期間外、車体番号未検出を確認してください。
