# メール転送 運用メモ

## 現在の状態：新着メールのみ転送中（2026-10-15再開）

- ユーザー様の「これからだけ、前のは不要」に基づき、2026-10-15 12:31:11（日本時間）より後のメールだけをSlack「メールbox」へ転送する。
- 対象は `seemore.co.ltd@gmail.com` の GAS `slackツール`。プロジェクトIDは `1Kw2yMdf4OeEfJ5wS6HDfh-74t4hDdZXXTZcCAVEbfL9KXAnIpPkbl67B`。
- `resumeGmailToSlackFromNow()` を本番所有アカウントで実行し、Script Property `GMAIL_TO_SLACK_START_AT` に開始日時を保存した。5分おきの `scheduledGmailToSlack` は1本。
- 本番診断：開始日時 `2026/10/15 12:31:11`、トリガー1本、転送ラベル中の新着0件・過去0件、検索候補0件。12:31:23〜12:31:25の初回処理は対象0件で正常完了。新着のSlack実着信はまだ未確認。
- 本番の `メール転送.gs` はローカル `gmail_to_slack_notification.js` と一致することを確認済み。時間主導型は `Head` を実行するため、このコード保存で反映される。別のWebアプリのデプロイや他のGASファイルは変更していない。
- Gmailのメール・既存ラベル・Webhook設定、他のGmail転送やSlack車案件連携は保持した。

### 停止・再開

- 停止：既存 `removeGmailToSlackTrigger()` で対象の実行予約だけを解除する。
- 同じ開始日時から復旧：`installGmailToSlackTrigger()`。トリガーは重複せず1本になる。
- 新規セットアップ：`resumeGmailToSlackFromNow()`。開始日時が未設定の場合だけその実行時点を保存する。再実行しても日時を動かさないため、復旧中に届いたメールを取りこぼさない。
- 次回停止後に再び「これからだけ」で再開する場合は、トリガー0件を確認してから `GMAIL_TO_SLACK_START_AT` を新しい再開時点のISO日時へ更新し、`installGmailToSlackTrigger()` を実行する。ユーザー様の対象期間の指示に従う。
- `getGmailToSlackStatus()` は日時・トリガー数・候補数を確認する読み取り専用診断。送信やラベル変更はしない。

### 転送機能のつながり

`再開 → 開始日時保存 → 5分トリガー → 除外条件＋after:検索 → 転送ラベル → 最新メールの日時再確認 → Slack送信 → slack転送済み`

- 日時が未設定・不正・未来の場合は送信せずエラーで停止する。
- 既に `転送` ラベルが付いた古いメールも、送信直前の日時確認で除外する。除外したメールを転送済み扱いにせず、ラベルも変更しない。
- 既存仕様の「スレッドの最新1通だけ」「転送済みラベル付きスレッドは新規検索から除外」は維持する。全返信通知への変更は含まない。
- 確認：`node --test メール転送/tests/future_only.test.cjs`（8件）、`node --check メール転送/gmail_to_slack_notification.js`。

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
3. `resumeGmailToSlackFromNow()` を1回実行し、開始日時と5分おきトリガーを設定する。既存運用の日時を初期化しない。
4. `getGmailToSlackStatus()` で開始日時とトリガー1本を確認する。
5. 新着メールが届いた後、定期実行の完了とSlack通知・`slack転送済み` ラベルを確認する。定期実行と転送関数の同時手動実行は避ける。
