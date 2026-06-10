# Plan

## Current Task: SEEMORE Slack 車案件 自動紐付けツール

Slack 内の車案件スレッドを、車体番号の完全一致だけで自動紐付けする Python ツールを `seemore-slack-linker/` に新規構築する。

## Integration Notes

- 既存の `メール転送/` 配下の Apps Script には触らない。
- Gmail 転送系の既存ファイルと設定には依存させない。
- Slack 車案件ツールは独立したフォルダ、独立した `.env`、独立した SQLite DB で管理する。
- 初期状態は必ず `DRY_RUN=true` とし、誤投稿より未投稿を優先する。

## Work Items

- `seemore-slack-linker/` に指定構成の Python プロジェクトを追加する。
- `app/vin.py` に車体番号の抽出・正規化を実装する。
- `app/slack_client.py` に `slack_sdk` の API ラッパーを集約する。
- `app/database.py` に SQLite テーブル作成、重複確認、履歴保存、エラー保存を実装する。
- `app/linker.py` に親スレッド取得、車体番号検索、子スレッドURL取得、重複防止、投稿処理をまとめる。
- `.env.example`、`requirements.txt`、`run.bat`、README を追加する。
- pytest で車体番号抽出と DB 重複判定を確認する。
- 変更を Git commit し、可能な場合は push する。

## Previous Completed Task

既存の `seemore.co.ltd@gmail.com` から Slack への通知処理に影響を出さず、別ファイルで `tsk.mons@gmail.com` 側の特定メールだけを `seemore.co.ltd@gmail.com` へ転送できるようにした。
