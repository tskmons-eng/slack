# Plan

## Goal

既存の `seemore.co.ltd@gmail.com` から Slack への通知処理に影響を出さず、別ファイルで `tsk.mons@gmail.com` 側の特定メールだけを `seemore.co.ltd@gmail.com` へ転送できるようにする。

## Work Items

- 既存の `メール転送/mail.js` は変更しない。
- Gmail から Gmail への転送専用 Apps Script を別ファイルで追加する。
- 転送先、検索条件、処理済みラベルをファイル上部の設定にまとめる。
- 構文確認を行う。
- Git リポジトリがない場合は新規作成し、変更をコミットして push する。
