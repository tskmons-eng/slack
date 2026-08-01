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

Slack 内の車案件スレッドを、車体番号またはスレIDの完全一致で自動紐付けする Google Apps Script 版を `seemore-slack-gas-linker/` に構築する。加えて、共通の5監視元でロケット／UFOリアクションを検出し、ルート別の依頼チャンネルへ転送する。PDFがなければリンクのみで転送する。

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
- `carmore依頼`、`オールマシンサービス`、`依頼_all`、`依頼_車案件`、`依頼＿小売取引` の5チャンネルを共通監視元にする。`rocket` は `依頼＿請求書`、`flying_saucer` は `依頼_振込` へ転送する。アーカイブ済みの `依頼_引き継ぎ` は対象外とする。
- 依頼リアクション監視はチャンネル別に最終スキャン状態、件数、ルート構成シグネチャを記録し、更新もルート変更もないチャンネルはスキップする。後付けリアクション対策として、一定時間ごとに強制再スキャンする。

## Work Items

- `seemore-slack-gas-linker/Code.gs` に setup、シート作成、Slack API、車体番号/スレID抽出、親子判定、投稿、dry run、重複防止、請求書転送を実装する。
- `seemore-slack-gas-linker/appsscript.json` に Asia/Tokyo と必要スコープを記載する。
- `seemore-slack-gas-linker/README.md` に Slack App 作成、Bot Token、GAS 作成、setup、認証、DRY_RUN、本番化、エラー確認の手順を日本語で整理する。
- `USER_PRIORITIES.md` を GAS 完結方針に更新する。
- `Code.gs` を静的に構文確認する。
- `clasp` でGoogleログイン、Apps Script API有効化、GASプロジェクト作成、push、デプロイを実行する。
- `setup()` 実行後にスプレッドシート、`scheduledMain()` の毎時トリガー1本、依頼リアクション転送設定を検証する。
- 変更を Git commit し、可能な場合は push する。

## 2026-07-30 UFO Reaction Forwarding

- 既存ロケットを残し、`invoice_forward_routes` で複数ルートを管理する。
- 初期ルートは `invoice_rocket / rocket / 依頼＿請求書` と `payment_ufo / flying_saucer / 依頼_振込`。
- 両ルートは同じ5監視元を使い、親投稿と返信の両方をSlack Eventsの即時処理と毎時回収で確認する。
- PDFありは `【PDF名 今日の日付】` と元投稿リンク、PDFなしは元投稿リンクだけを投稿する。
- 重複キーへ転送先IDを含め、同じ元投稿でもルートごとに一度だけ転送する。
- 監視元または転送先の1件が未解決でも他を継続し、未解決名を診断へ残す。
- ルート構成シグネチャが変わった場合は、最新投稿が変わっていないチャンネルも再スキャンする。
- Web管理にはルート更新、`route_name` 指定dry-run／本番実行、指定投稿1件の回収を用意する。
- 合成テスト、UFOのPDFあり／なし／返信、付け直し時の二重防止、ロケット回帰、Slack Events、毎時トリガー、5監視元を本番で確認する。
- `clasp push` 後にGASバージョンを作成し、既存のセットアップ用Web AppとAPI executableの2デプロイを同じバージョンへ更新する。

実施結果:

- GAS version 74をセットアップ用Web AppとAPI executableへ反映した。
- アーカイブ済み `依頼_引き継ぎ` を除く5監視元、2ルート、転送先・監視元の未解決0、毎時トリガー1本を本番で確認した。
- UFOのPDFあり親投稿、PDFなし親投稿、返信を `依頼_振込` へ転送し、Slack Eventsからの自然到着も確認した。
- UFOの付け直しとEvents再送は `duplicate_skipped_count=1`、`posted_count=0` となり、転送先へ増えないことを確認した。
- ロケット／UFOのルート別dry-runはともに5監視元、30親投稿、241返信、エラー0で完了し、既存候補はすべて重複として抑止した。
- `INVOICE_FORCE_RESCAN_HOURS=1` へ移行し、差分スキャンでは `last_full_scan_at` を更新しないようにして、後付けリアクションの毎時回収を維持した。
- version 74の `scheduledMain()` は23秒、`completed=true`、`deadline_reached=false`、`error_count=0` で完了した。

## 2026-08-01 Vehicle Link Channel Expansion

- 車体番号／スレIDの大親は引き続き `依頼_車案件` とする。
- 子チャンネルを既存の `carmore依頼`、`オールマシンサービス` に加え、`依頼_all`、`電話対応`、`依頼_振込` へ拡張する。
- `依頼_振込` の既存UFO転送先としての役割は変更せず、車案件リンク走査の子チャンネルとしてのみ追加する。
- 本番設定はBot参加と親子重複を検証する管理アクションから更新し、`DRY_RUN=true` のまま実走査で候補数・エラー・時間上限を確認する。

実施結果:

- 3件の実チャンネル名とBot参加を確認し、既存2件と合わせた5子チャンネルを本番設定へ保存した。
- ローカル構文・合成・管理アクションテストが通り、GAS version 75を2つの本番デプロイへ反映した。
- 60日・各20スレッドの本番dry-runは、親3件、リンクキー2件、子一致1件、投稿予定2件、エラー0、期限到達なしで完了した。
- 毎時トリガー1本と既存ロケット／UFOルート2件は維持されている。
- 車案件リンクは `DRY_RUN=true` のため候補検出まで正常作動し、自動投稿だけを意図的に停止している。

## 2026-08-02 Vehicle Link Automatic Posting

- ユーザー様の明示指示に基づき、車案件リンクの `DRY_RUN=false` を本番設定へ反映する。
- 請求書／UFO／汎用リアクション処理を巻き込まず、車案件リンクだけを確認付き管理アクションで限定実行する。
- 切替直前の60日・各20スレッドdry-runで候補・エラー・期限状態を再確認する。
- 本番実行後は投稿件数、重複スキップ、エラー、時間上限、毎時トリガー、既存ルート維持を確認する。

実施結果:

- `DRY_RUN=false` へ切り替え、車案件リンク専用実行で2件をSlackへ投稿した。エラー、延期チャンネル、期限到達はいずれも0件だった。
- Slack画面で2026-08-02 00:17 JSTの2投稿（同一車体番号の親スレリンク、`電話対応` の関連依頼リンク）を確認した。
- 同条件の再実行は `posted_count=0`、`duplicate_skipped_count=2` となり、追加投稿は発生しなかった。
- 毎時実行との同時起動に備え、最終重複確認・投稿・記録を `ScriptLock` 内へまとめた。
- GAS version 77を2つの本番デプロイへ反映し、毎時トリガー1本と既存ロケット／UFOルート2件が維持されていることを確認した。

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
- スタンプが押された瞬間に転送するため、Slack Events APIの `reaction_added` をGAS `doPost` で受ける。

## 2026-06-14 Invoice Monitoring Hardening

- 旧デフォルトの `INVOICE_LOOKBACK_DAYS=7`、`INVOICE_HISTORY_LIMIT=50`、`INVOICE_REPLY_THREAD_LIMIT=10` は、次回実行時に `30`、`100`、`25` へ自動移行する。`INVOICE_FORCE_RESCAN_HOURS=6` または旧運用値 `3` は、毎時回収のため `1` へ自動移行する。
- `INVOICE_HISTORY_PAGE_LIMIT=3` を追加し、新着検知時は前回最新ts以降、初回/強制再スキャン時はlookback範囲を最大3ページまで追う。
- 既存の5本トリガーが残っていても、次回 `scheduledMain()` 実行時に期待トリガー数と違えば `MAIN_TRIGGER_INTERVAL_HOURS=1` の毎時トリガーへ作り直す。
- Slack Events API用に `doPost` の `reaction_added` 受け口を追加する。利用にはWebアプリをSlackから到達できる公開設定にし、`SLACK_EVENT_REQUEST_TOKEN` 付きRequest URLをSlack側へ設定する必要がある。
- それでもBot未参加チャンネル、lookback外の古い投稿、ページ上限超過、返信rootが範囲外、Slack API/GAS実行時間エラーでは送信漏れまたは遅延があり得る。

## 2026-06-14 Invoice Monitoring Assumptions and Limits

- 2026-07-30以降の実運用監視元は、アーカイブ済み `依頼_引き継ぎ` を除いた5チャンネルとする。
- 新規投稿は少なく、古い投稿またはその返信へ `rocket` / `flying_saucer` を後から押す使い方がある。
- 1時間以内の転送は許容範囲だが、未転送も誤転送も避ける必要がある。
- ロケット／UFOはSlack Events APIの `reaction_added` で即時転送し、1時間ポーリングを保険として残す。
- 車体番号/スレID紐付けは過去スレッドとの照合が必要なため、Slack Events APIだけに置き換えず定期クロールを継続する。
- `INVOICE_MAX_RUNTIME_SECONDS=300` を追加し、GASの1実行6分上限に近づく前に途中停止する。残ったチャンネルは最終確認時刻順で次回優先する。
- Slack APIがHTTP 429を返した場合は `Retry-After` を最大30秒まで待って1回再試行する。

## 2026-06-14 Slack Events Activation

- GAS WebアプリはSlack Events APIから到達できるよう `ANYONE_ANONYMOUS` / `USER_DEPLOYING` の公開デプロイを使う。
- 公開デプロイでは管理系GET/POSTを裸で動かさず、`WEB_ADMIN_TOKEN` を `admin_token` パラメータで要求する。
- Slack Events Request URLは `?slack_event_token={SLACK_EVENT_REQUEST_TOKEN}` 付きにし、GAS側で一致確認してから `url_verification` / `reaction_added` を処理する。
- Slack AppのEvent SubscriptionsでRequest URLを設定し、Bot Eventsに `reaction_added` を追加する。
- version 42でSlack Events APIを有効化済み。Slack側はEnable Events On、Request URL Verified、Delayed Events On、Bot Event `reaction_added` 登録済み。
- Slack `url_verification` はScript Properties上の `SLACK_EVENT_REQUEST_TOKEN` で即応答し、シート読み込みによるタイムアウトを避ける。

## 2026-06-16 Invoice Duplicate Forward Hardening

- 請求書ロケット転送はSlack Events APIの再送、またはEventsと1時間ポーリングが重なった場合に備え、投稿直前から `invoice_reaction_posts` 記録完了までScript Lockで直列化する。
- ロック内で同じ元チャンネル、元投稿ts、PDFキー、リアクションの転送済み確認を再実行し、先行実行が投稿済みなら後続実行は `duplicate_skipped_count` としてスキップする。
- `invoice_reaction_posts` への記録前に再実行された場合にも備え、投稿先チャンネルの直近履歴に同じ元投稿URLがあればスキップする。
- ロック取得待ちは30秒までにし、ロック待ちやSlack APIの一時失敗で転送できなかった場合は次回の1時間ポーリングで再確認する。

## 2026-06-12 Gmail Slack Link Fix

- Gmail to Slack 通知のリンクは TinyURL を経由しない。Slack の表示リンクで Gmail 直リンクを出し、外部短縮APIの遅延を避ける。
- Gmail UI URL は `message.getId()` ではなく `thread.getId()` を使い、Slack経由でも崩れにくい `https://mail.google.com/mail/u/0/#all/{threadId}` 形式でスレッドを開く。
- Slack通知内のリンク行は1行だけにし、`メールを開く` の表示リンクにする。余計な検索リンクや「開けない時」行は出さない。

## 2026-06-27 Vehicle Inspection OCR

- Slack に送られた車検証の画像またはPDFを読み取り、必要項目を文字でSlackへ返す導線を `seemore-slack-gas-linker/` に追加する。
- 汎用OCRの丸読みではなく、車検証のレイアウト比率がほぼ固定である前提を活かした項目抽出を優先する。
- 第1段階は OpenAI で実サンプルを評価し、全体画像と項目別抽出の精度を確認する。
- 第2段階は、必要に応じて台形補正、正規化、項目別クロップ、再読取を追加し、固定帳票としての精度を上げる。
- 専用OCR APIの導入は、OpenAI 単体で目標精度に届かない場合の比較候補として残す。先に実サンプルで誤読傾向を確認する。
- Slack Events の受け口で重いOCR処理を直実行せず、必要ならキュー化して非同期で返信できる構造を優先する。
- 実サンプル評価では、少なくとも「きれいなスキャン」「少し傾いた画像」「影やしわがある画像」を含めて誤読パターンを確認する。
