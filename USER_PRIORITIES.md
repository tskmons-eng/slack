# User Priorities

## SEEMORE Slack 車案件 自動紐付け

- Slack 車案件ツールは、既存の `メール転送/` Apps Script とは競合しない独立フォルダで管理する。
- 今回の本命実装は `seemore-slack-gas-linker/` の Google Apps Script 版とし、既存の Python/SQLite 版 `seemore-slack-linker/` とは混ぜない。
- ローカルPC、VPS、Python、SQLite は使わず、Google Apps Script + Slack API + Google スプレッドシートで完結させる。
- 設定は `.env` ではなく `settings` シートで管理する。
- AI判断や曖昧一致は使わず、車体番号またはスレIDの完全一致だけで紐付ける。
- スレIDは `スレID:` / `スレID：`、`ID` の全角/半角/小文字、値の全角英数字、大文字小文字、空白混在を吸収し、空白は削除して判定する。
- 初期状態は必ず `DRY_RUN=true` にし、本番投稿は `settings` シートで明示的に `DRY_RUN=false` に変えた時だけ行う。
- 同じスレッドURLは、`linked_threads` シートと投稿先Slackスレッド内の既存投稿の両方で重複確認して二重投稿しない。
- 処理対象は最終更新から60日以内のスレッドだけにする。
- Slack検索が失敗した場合は、勝手に全件クロールへ切り替えず、エラーとしてログ保存する。
- 毎日03:00、13:00、20:00付近にGASトリガーで自動実行し、PCを閉じていても動く構成にする。
- 誤投稿より未投稿を優先する。
- `依頼＿ALL` のPDF投稿にロケットリアクションが付いたら、`依頼＿請求書` へ `【ファイル名 今日の日付】` と元投稿リンクを自動投稿する。

## Gmail 転送

- 既存の Gmail から Slack への通知システムに支障を出さない。
- Gmail から Gmail への転送は、既存ファイルへつぎ足さず別ファイルで管理する。
- 仕組みはできるだけ簡単にし、後から条件や転送先を変更しやすくする。
- `tsk.mons@gmail.com` 側の一部メールを `seemore.co.ltd@gmail.com` へ転送する。
- `2026-06-02 17:27:19 +09:00` 以降に届く `Yahoo!オークション - 取引メッセージ：` のメールだけを転送する。
- 転送が成功したメールには `forwarded_to_seemore` ラベルを付け、再転送を防ぐ。

## Slack Link Presentation

- 自動投稿するSlack元投稿リンクは、手動でSlackアプリから共有した時と同じようにサムネイル/リンクプレビューが出る状態を優先する。URL文字列だけの表示は避ける。

## Slack Schedule

- 車案件紐付けと請求書転送の定期チェックは、当面1日5回の `3,10,13,16,20` 時台を基準にする。
