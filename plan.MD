# Plan

## 2026-06-12 GitHub Publishing Helper

- `tskmons-eng/slack` をGitHubに作成し、ローカル `main` を `origin/main` へpushする。
- 他のフォルダでも同じ作業を繰り返せるよう、`scripts/publish-to-github.ps1` でremote設定とpushを標準化する。
- GitHub CLIにログイン済みなら `-Create` でrepo作成から実行し、未ログインの場合はGitHub画面でrepoを作ってから同じスクリプトでpushする。

## 2026-06-12 Gmail Slack Forwarding Reset

- `seemore.co.ltd@gmail.com` の受信箱で、除外条件に当たらないメールへ `転送` ラベルを付ける。
- Slack通知は `転送` ラベル付きだけを対象にし、送信成功後に `転送` を外して `slack転送済み` を付ける。
- 定期実行は `scheduledGmailToSlack()` 1本にし、`labelGmailToSlackTargets()` の直後に `forwardLabeledGmailToSlack()` を実行する。
- Slack本文の見た目は既存形式を維持し、リンク行だけ `メールを開く` 表示のGmail直リンクにする。TinyURLと「開けない時」行は使わない。
- 除外条件はユーザー様指定の `newer_than:14d`、`-from:me`、`-label:slack転送済み`、指定subject/fromのリストを使う。
- Gmail検索では `-subject:Notion Team` のように空白を含む除外語を裸で書くと `Team` が必須検索語扱いになるため、`-subject:"Notion Team"` のように引用符で囲む。

## Current Task: SEEMORE Slack 車案件 自動紐付けツール

Slack 内の車案件スレッドを、車体番号またはスレIDの完全一致で自動紐付けする Google Apps Script 版を `seemore-slack-gas-linker/` に構築する。加えて、ロケットリアクション付き投稿を請求書チャンネルへ転送し、PDFがなければリンクのみで転送する。

## Integration Notes

- 既存の `メール転送/` 配下の Apps Script には触らない。
- Gmail 転送系の既存ファイルと設定には依存させない。
- 既存の `seemore-slack-linker/` は Python/SQLite 版の過去実装として残し、今回の GAS 版とは混ぜない。
- Slack 車案件 GAS 版は独立した `seemore-slack-gas-linker/` で管理する。
- ローカルPC、VPS、Python、SQLite は使わず、Google Apps Script + Slack API + Google スプレッドシートで完結させる。
- 設定は `.env` ではなく `settings` シートで管理する。
- 初期状態は必ず車案件側を `DRY_RUN=true` とし、誤投稿より未投稿を優先する。
- スレIDは `スレID:` / `スレID：`、全角ID、小文字id、全角英数字、空白混在を正規化し、つながっていれば同じものとして扱う。
- GAS トリガーで `scheduledMain()` を1時間ごとに実行し、PCを閉じていても動く構成にする。
- Botが参加している全チャンネルを請求書ロケット監視候補にし、ロケットリアクション付き投稿を `依頼＿請求書` へ転送する。PDFがあれば `【ファイル名 今日の日付】` と元投稿リンク、PDFがなければ元投稿リンクのみを投稿する。
- 請求書ロケット監視はチャンネル別に最終スキャン状態と件数を記録し、更新がないチャンネルはスキップする。後付けリアクション対策として、一定時間ごとに強制再スキャンする。

## Work Items

- `seemore-slack-gas-linker/Code.gs` に setup、シート作成、Slack API、車体番号/スレID抽出、親子判定、投稿、dry run、重複防止、請求書転送を実装する。
- `seemore-slack-gas-linker/appsscript.json` に Asia/Tokyo と必要スコープを記載する。
- `seemore-slack-gas-linker/README.md` に Slack App 作成、Bot Token、GAS 作成、setup、認証、DRY_RUN、本番化、エラー確認の手順を日本語で整理する。
- `USER_PRIORITIES.md` を GAS 完結方針に更新する。
- `Code.gs` を静的に構文確認する。
- `clasp` でGoogleログイン、Apps Script API有効化、GASプロジェクト作成、push、デプロイを実行する。
- `setup()` 実行後にスプレッドシート、`scheduledMain()` 3本トリガー、請求書転送設定を検証する。
- 変更を Git commit し、可能な場合は push する。

## Previous Completed Task

既存の `seemore.co.ltd@gmail.com` から Slack への通知処理に影響を出さず、別ファイルで `tsk.mons@gmail.com` 側の特定メールだけを `seemore.co.ltd@gmail.com` へ転送できるようにした。

## 2026-06-11 Runtime Notes

- Slack App `A0B9TSCGZAR` was created in SEEMORE and installed.
- Bot token is saved in the GAS `settings` sheet.
- Target Slack channels are private. The bot was invited to `依頼_車案件`, `carmore依頼`, and `オールマシンサービス`.
- Slack `search.messages` returned `not_allowed_token_type` for Bot tokens, so the GAS implementation relies on `conversations.history` over joined channels instead of Slack search.

## 2026-06-12 Invoice Follow-up

- 請求書転送は root 投稿だけでなく、`reply_count` がある root から最大 `INVOICE_REPLY_THREAD_LIMIT=10` スレまで返信も確認する。
- 転送対象は同じメッセージに `rocket` リアクションがあるものに限定する。PDF ファイルがあればファイル名付き、PDFがなければリンクのみで転送し、同一スレ内の無関係な PDF までは広げない。
- dry run では root/reply 区分、リアクション名、ファイル名、PDF 名を `message_samples` に出し、Slack 側の付与位置を確認できるようにする。
- version 28 でテスト PDF `保冷バック.pdf` の返信転送を本番実行済み。直後の dry run は `duplicate_skipped_count=1` で重複回避を確認済み。

## 2026-06-12 Slack Link Preview Follow-up

- 車案件の紐付け返信と請求書転送の元投稿リンクは、URL文字列だけでなくSlack上のサムネイル/リンクプレビュー表示を優先する。
- Slack API投稿時は `unfurl_links=true` / `unfurl_media=true` にし、`chat.getPermalink` の `cid=` 型URLは手動コピーに近い `channel=` / `message_ts=` 付きURLへ整形する。
- Slack内部リンクはBot投稿だと手動共有と同じネイティブプレビューにならない場合があるため、本文URLをリンクラベル化し、Bot側で元投稿カードを添付する。

## 2026-06-12 Schedule Update

- 定期実行は1日5回、`MAIN_TRIGGER_HOURS=3,10,13,16,20` とする。
- Web管理アクション `?action=set_schedule&hours=...&confirm=UPDATE_SCHEDULE` は `MAIN_TRIGGER_HOURS` だけを更新し、`scheduledMain()` のトリガーを作り直す。

## 2026-06-14 Invoice Monitoring Expansion

- 請求書ロケット監視は `INVOICE_SOURCE_CHANNEL_NAMES=*` を初期値にし、Bot参加済み全チャンネルを対象にする。ただし転送先 `依頼＿請求書` 自身は除外する。
- 定期実行は `MAIN_TRIGGER_INTERVAL_HOURS=1` の1時間ごとトリガーにする。`MAIN_TRIGGER_INTERVAL_HOURS` を空にした場合だけ、旧来の `MAIN_TRIGGER_HOURS` 日次時刻指定を使う。
- `invoice_channel_scan_state` にチャンネルごとの最終確認時刻、最後にフルスキャンした時刻、最新投稿ts、確認件数、候補数、投稿数、重複スキップ数、エラーを保存する。
- 通常は最新投稿tsが変わったチャンネルだけフルスキャンし、新着がないチャンネルはスキップする。後付けスタンプ対策として `INVOICE_FORCE_RESCAN_HOURS` を過ぎたチャンネルは新着がなくても再スキャンする。
- スタンプが押された瞬間に転送するには、将来Slack Events APIの `reaction_added` をGAS `doPost` で受ける設計に進める。
## 2026-06-12 Gmail Slack Link Fix

- Gmail to Slack 通知のリンクは TinyURL を経由しない。Slack の表示リンクで Gmail 直リンクを出し、外部短縮APIの遅延を避ける。
- Gmail UI URL は `message.getId()` ではなく `thread.getId()` を使い、Slack経由でも崩れにくい `https://mail.google.com/mail/u/0/#all/{threadId}` 形式でスレッドを開く。
- Slack通知内のリンク行は1行だけにし、`メールを開く` の表示リンクにする。余計な検索リンクや「開けない時」行は出さない。
