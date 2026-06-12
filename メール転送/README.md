# メール転送 運用メモ

## 残すもの

- `gmail_to_gmail_forward.js`
  - `tsk.mons@gmail.com` 側の一部メールを `seemore.co.ltd@gmail.com` へ転送する既存処理。
  - Yahoo!オークション取引メッセージ用なので、今回のSlack通知修正では触らない。

## Slack通知

- `mail.js`
  - 実運用用。Slack Webhook URLはScript Propertiesで管理し、コードには含めない。
- `gmail_to_slack_notification.js`
  - Apps Scriptへ貼り付けやすい安全版。Webhook URLは含めない。
  - Apps Scriptは `seemore.co.ltd@gmail.com` で実行する。
  - `SLACK_WEBHOOK_URL` をScript Propertiesに保存してから使う。
  - 個人Gmailで実行された場合は、誤通知防止のためエラーで停止する。
  - `tsk.mons@gmail.com` 宛のメールは、seemore側へ転送されてきてもSlack通知しない。

## セットアップ

1. `seemore.co.ltd@gmail.com` のApps Scriptプロジェクトに `gmail_to_slack_notification.js` の内容を入れる。
2. Script Propertiesに `SLACK_WEBHOOK_URL` を設定する。
3. `installGmailToSlackTrigger()` を1回実行して5分おきのトリガーを作る。
4. `tsk.mons@gmail.com` 側で動いている `forwardLabeledGmailToSlack` トリガーがあれば止める。
