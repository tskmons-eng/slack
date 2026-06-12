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
  - `scheduledGmailToSlack()` は、除外条件に当たらない受信メールへ `転送` ラベルを付け、その `転送` ラベル付きだけをSlackへ送る。
  - Slack送信が200で成功したら `転送` を外し、`slack転送済み` を付ける。
  - Slackのリンク行は外部短縮URLを使わず、`メールを開く` という短い表示でGmail直リンクを開く。

## セットアップ

1. `seemore.co.ltd@gmail.com` のApps Scriptプロジェクトに `gmail_to_slack_notification.js` の内容を入れる。
2. Script Propertiesに `SLACK_WEBHOOK_URL` を設定する。
3. `labelGmailToSlackTargets()` を手動実行し、対象メールだけに `転送` ラベルが付くことを確認する。
4. `forwardLabeledGmailToSlack()` を手動実行し、Slack送信と `slack転送済み` ラベル付与を確認する。
5. `scheduledGmailToSlack()` を手動実行し、ラベル付けから転送まで一連で動くことを確認する。
6. `installGmailToSlackTrigger()` を1回実行して、`scheduledGmailToSlack` の5分おきトリガーを作る。
