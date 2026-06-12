# Plan

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
- 毎日03:00、10:00、13:00、16:00、20:00付近に GAS トリガーで `scheduledMain()` を実行し、PCを閉じていても動く構成にする。
- `依頼＿ALL` の投稿にロケットリアクションが付いたら、`依頼＿請求書` へ転送する。PDFがあれば `【ファイル名 今日の日付】` と元投稿リンク、PDFがなければ元投稿リンクのみを投稿する。

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

## 2026-06-12 Schedule Update

- 定期実行は1日5回、`MAIN_TRIGGER_HOURS=3,10,13,16,20` とする。
- Web管理アクション `?action=set_schedule&hours=...&confirm=UPDATE_SCHEDULE` は `MAIN_TRIGGER_HOURS` だけを更新し、`scheduledMain()` のトリガーを作り直す。
