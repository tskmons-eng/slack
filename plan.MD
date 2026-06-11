# Plan

## Current Task: SEEMORE Slack 車案件 自動紐付けツール

Slack 内の車案件スレッドを、車体番号の完全一致だけで自動紐付けする Google Apps Script 版を `seemore-slack-gas-linker/` に構築する。

## Integration Notes

- 既存の `メール転送/` 配下の Apps Script には触らない。
- Gmail 転送系の既存ファイルと設定には依存させない。
- 既存の `seemore-slack-linker/` は Python/SQLite 版の過去実装として残し、今回の GAS 版とは混ぜない。
- Slack 車案件 GAS 版は独立した `seemore-slack-gas-linker/` で管理する。
- ローカルPC、VPS、Python、SQLite は使わず、Google Apps Script + Slack API + Google スプレッドシートで完結させる。
- 設定は `.env` ではなく `settings` シートで管理する。
- 初期状態は必ず `DRY_RUN=true` とし、誤投稿より未投稿を優先する。
- 毎日03:00に GAS トリガーで `main()` を実行し、PCを閉じていても動く構成にする。

## Work Items

- `seemore-slack-gas-linker/Code.gs` に setup、シート作成、Slack API、車体番号抽出、親子判定、投稿、dry run、重複防止を実装する。
- `seemore-slack-gas-linker/appsscript.json` に Asia/Tokyo と必要スコープを記載する。
- `seemore-slack-gas-linker/README.md` に Slack App 作成、Bot Token、GAS 作成、setup、認証、DRY_RUN、本番化、エラー確認の手順を日本語で整理する。
- `USER_PRIORITIES.md` を GAS 完結方針に更新する。
- `Code.gs` を静的に構文確認する。
- `clasp` でGoogleログイン、Apps Script API有効化、GASプロジェクト作成、push、デプロイを実行する。
- 初回 `setup()` はChromeのGoogle権限許可画面で停止中。許可後にスプレッドシートと03:00トリガーを検証する。
- 変更を Git commit し、可能な場合は push する。

## Previous Completed Task

既存の `seemore.co.ltd@gmail.com` から Slack への通知処理に影響を出さず、別ファイルで `tsk.mons@gmail.com` 側の特定メールだけを `seemore.co.ltd@gmail.com` へ転送できるようにした。

## 2026-06-11 Runtime Notes

- Slack App `A0B9TSCGZAR` was created in SEEMORE and installed.
- Bot token is saved in the GAS `settings` sheet.
- Target Slack channels are private. The bot was invited to `依頼_車案件`, `carmore依頼`, and `オールマシンサービス`.
- Slack `search.messages` returned `not_allowed_token_type` for Bot tokens, so the GAS implementation relies on `conversations.history` over joined channels instead of Slack search.
