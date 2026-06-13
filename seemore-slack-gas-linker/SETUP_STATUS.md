# SEEMORE Slack GAS Linker Setup Status

Last updated: 2026-06-14 02:27 JST

## Completed

- Google `clasp` login completed as `tsk.mons@gmail.com`.
- Apps Script API was enabled for the Google account.
- Apps Script project was created.
- `Code.gs` and `appsscript.json` were pushed to Apps Script.
- Versioned deployments were created.
- A self-only web setup endpoint was deployed.
- The self-only web setup endpoint was updated to version 4 with `?action=status`.
- The setup endpoint was authorized and executed successfully.
- The required spreadsheet, sheets, settings defaults, and `main()` trigger were verified through `?action=status`.
- A Slack settings endpoint was deployed at `?action=slack`.
- The Slack settings form was verified with an invalid token; validation prevented saving.
- Slack App manifest was prepared at `slack-app-manifest.yml`.
- Slack App `A0B9TSCGZAR` was created in the SEEMORE workspace.
- Slack App Bot Token Scopes were configured for channel list, channel history, private channel list/history, and posting.
- The Slack App was installed to SEEMORE.
- The Bot Token was saved in the `settings` sheet.
- The Bot was invited to `依頼_車案件`, `carmore依頼`, and `オールマシンサービス`.
- Slack API direct verification passed for `auth.test`, `conversations.list`, and `conversations.history` on all three target channels.
- GAS `?action=test_logic` passed for oldest-parent selection, oldest-child representative selection, parent duplicate action creation, same-channel duplicate action creation, child representative-to-parent actions, and partial VIN exclusion.
- GAS `?action=test_slack` passed.
- GAS bounded dry run `?action=dryrun&lookback_days=7&max_threads_per_channel=5` completed with `DRY_RUN=true`, `posted_count=0`, and `error_count=0`.
- Direct Slack scan found no parent-channel threads containing explicit `車体番号:` or `車台番号:` labels in the recent 60-day window; planned posts are currently 0 because there is no matching parent VIN input under the current extraction rule.

## 2026-06-12 Real Slack Verification

- Web deployment was updated to version 25 with VIN label diagnostics, targeted thread linking, and hardened duplicate detection.
- After the real `車体番号:` comment was added, `?action=scan_labels&channel_role=parent&lookback_days=365&max_threads_per_channel=300` found 2 VIN-labelled parent threads from 39 scanned parent threads.
- `carmore依頼` scan found 3 VIN-labelled threads from 40 scanned child threads, including 1 VIN matching a parent thread.
- Targeted dry run for the matched parent/carmore pair completed with `planned_count=1`, `posted_count=0`, `duplicate_skipped_count=0`, and `error_count=0`.
- Targeted production run for the matched parent/carmore pair completed with `posted_count=1` and `error_count=0`.
- Immediate duplicate verification exposed that the earlier timestamp-based duplicate check could miss already linked rows after Google Sheets numeric conversion. One duplicate Slack reply was posted during that verification.
- Duplicate detection was hardened to compare source/target permalinks, tolerate Slack URL markup, and store `linked_threads` rows as text. A post-fix targeted dry run completed with `planned_count=0`, `posted_count=0`, `duplicate_skipped_count=1`, and `error_count=0`.

## 2026-06-12 Version 26 Deployment

- Scheduled handler changed to `scheduledMain()` so one time trigger run can execute both vehicle/thread linking and invoice forwarding.
- Daily trigger target hours are configurable through `MAIN_TRIGGER_HOURS`, defaulting to `3,13,20`. Apps Script time triggers run near the selected minute, not exactly on the minute.
- Thread linking now supports both `車体番号:` / `車台番号:` and `スレID:` labels. Values are normalized with NFKC, uppercasing, and whitespace removal before exact-match comparison.
- `依頼＿ALL` to `依頼＿請求書` invoice forwarding was added for PDF root messages with the `rocket` reaction. Duplicate forwarding is tracked in `invoice_reaction_posts`.
- Slack App manifest now includes `reactions:read` and `files:read`; the Slack App must be reinstalled after adding these scopes.
- `clasp push` succeeded, and both the self setup web deployment and API executable deployment were updated to version 26.
- Browser execution of `?action=setup` succeeded. The `invoice_reaction_posts` sheet exists with a valid header.
- `?action=setup` status confirmed `MAIN_TRIGGER_HOURS=3,13,20`, `scheduled_handler=scheduledMain`, and `scheduled_trigger_count=3`.
- Browser execution of `?action=test_logic` returned `ok=true`; the page showed generated parent duplicate, same-channel duplicate, child-to-parent, and thread ID action output.
- Browser execution of `?action=invoice_dryrun` returned `ok=false` with `Slack channel not found or bot is not invited: 依頼＿ALL`. The invoice forwarding code is deployed, but Slack channel membership and/or channel-name visibility must be fixed before live invoice forwarding can be verified.

## 2026-06-12 Version 28 Invoice Verification

- Web and API executable deployments were updated to version 28 after adding invoice thread-reply scanning and dry-run message samples.
- Slack App reinstall and bot channel invitation were verified indirectly: `?action=invoice_dryrun` returned `ok=true` and resolved both `依頼＿ALL` and `依頼＿請求書`.
- Invoice dry run found the test PDF in a thread reply: `messages_checked=5`, `reply_threads_checked=3`, `reply_messages_checked=44`, `candidates_found=1`, `planned_count=1`, and `error_count=0`.
- The matching reply had the `rocket` reaction and PDF file `保冷バック.pdf`.
- Manual production run `?action=invoice_run&confirm=RUN_INVOICE_FORWARD` succeeded with `posted_count=1`, `planned_count=0`, and `error_count=0`.
- Immediate duplicate dry run returned `candidates_found=1`, `planned_count=0`, `duplicate_skipped_count=1`, and `error_count=0`.

## 2026-06-12 Version 29 Slack Link Preview Update

- Web and API executable deployments were updated to version 29 after enabling Slack link unfurls for both vehicle/thread linking replies and invoice forwarding posts.
- `chat.getPermalink` results are normalized from Slack API `cid=` style to Slack app share style with `channel=` and `message_ts=` query parameters while preserving `thread_ts`.
- Browser execution of `?action=test_logic` returned `ok=true` after adding the permalink formatting assertion.
- Browser execution of `?action=invoice_dryrun` returned `ok=true` and kept the verified invoice duplicate at `duplicate_skipped_count=1`.

## 2026-06-12 Version 31 Schedule Update

- Web and API executable deployments were updated to version 31 after adding `?action=set_schedule&hours=...&confirm=UPDATE_SCHEDULE`.
- `MAIN_TRIGGER_HOURS` was updated from `3,13,20` to `3,10,13,16,20`.
- Browser execution of `?action=status` confirmed `main_trigger_hours=3,10,13,16,20`, `scheduled_handler=scheduledMain`, and `scheduled_trigger_count=5`.

## 2026-06-12 Version 33 Invoice Link-only Fallback

- Web and API executable deployments were updated to version 33 after allowing rocket-marked invoice candidates without a PDF file.
- If a candidate has a PDF, invoice forwarding still posts `【file name yyyy-mm-dd】` plus the source Slack link.
- If a candidate has no PDF, invoice forwarding posts only the source Slack link and stores a `no-pdf:<message_ts>` duplicate key in `invoice_reaction_posts`.
- Browser execution of `?action=invoice_run&confirm=RUN_INVOICE_FORWARD` succeeded with `candidates_found=2`, `posted_count=1`, `duplicate_skipped_count=1`, `link_only_count=1`, and `error_count=0`.

## 2026-06-12 Version 34 Slack Preview Card Fallback

- Web and API executable deployments were updated to version 34 after adding Slack attachment cards to automatic internal-link posts.
- Vehicle/thread linking replies and invoice forwarding posts now send labeled Slack links plus a small source-post card instead of relying only on Slack native unfurl behavior.
- Existing invoice forwarding posts were refreshed through `?action=refresh_invoice_previews&confirm=RUN_INVOICE_FORWARD`: `checked_rows=2`, `updated_count=2`, `skipped_count=0`, and `error_count=0`.
- Browser execution of `?action=test_logic` returned `ok=true` on the version 34 deployment.

## 2026-06-14 Version 35 Invoice Monitoring Expansion

- `clasp push` succeeded for `Code.gs` and `appsscript.json`.
- Web and API executable deployments were updated to version 35 after adding all-joined-channel invoice rocket monitoring, hourly trigger support, and per-channel scan state recording.
- New settings are seeded on the next `setup()` or `scheduledMain()` run: `MAIN_TRIGGER_INTERVAL_HOURS=1`, `INVOICE_SOURCE_CHANNEL_NAMES=*`, and `INVOICE_FORCE_RESCAN_HOURS=6`.
- New sheet `invoice_channel_scan_state` records source channel name/id, last check/full scan timestamps, latest Slack ts values, checked counts, candidate counts, posted/planned counts, duplicate skips, skip state, and last error.
- New Web diagnostic action `?action=joined_channels` lists Bot-joined channels and the current invoice source candidates.
- Local static syntax check passed through Node UTF-8 parsing.
- Local synthetic `testResolveVinGroups()` passed with Logger mocked: `ok=true`, `actions=4`, `thread_id_actions=1`.
- `clasp run` could not execute functions from this environment: dev mode returned a permission error, and `--nondev` returned `Script function not found`. Because the Web app is `MYSELF` access, live joined-channel listing and hourly trigger replacement must be confirmed through the logged-in Web app.

## 2026-06-14 Invoice Monitoring Hardening Follow-up

- Local static syntax check passed through Node UTF-8 parsing.
- Local synthetic `testResolveVinGroups()` passed with Logger mocked: `ok=true`, `actions=4`, `thread_id_actions=1`.
- `clasp push` succeeded, and both the self setup web deployment and API executable deployment were updated to version 36.
- Old invoice polling defaults are migrated on the next Apps Script run when they still match the previous defaults:
  - `INVOICE_LOOKBACK_DAYS`: `7` -> `30`
  - `INVOICE_HISTORY_LIMIT`: `50` -> `100`
  - `INVOICE_REPLY_THREAD_LIMIT`: `10` -> `25`
  - `INVOICE_FORCE_RESCAN_HOURS`: `6` -> `3`
- Added `INVOICE_HISTORY_PAGE_LIMIT=3`; channel history now paginates up to 3 pages instead of only reading the first page.
- For channels with new messages, invoice polling scans from the previous latest Slack timestamp forward. For first scans and forced rescans, it scans the configured lookback window.
- Existing scheduled triggers self-heal during `scheduledMain()` if the count does not match the desired schedule, so the old 5-trigger setup is replaced by the hourly trigger after the next successful scheduled run.
- Added optional Slack Events API handling in `doPost` for `reaction_added`; it uses `reactions.get` to fetch the exact reacted message and forwards it through the same duplicate-safe invoice path.
- Slack Events API is not active unless the Web app is deployed with Slack-reachable access and `SLACK_EVENT_VERIFICATION_TOKEN` is configured in the settings sheet.
- Remaining miss/delay risks: Bot not invited to a channel, reacted message older than lookback, more messages than `INVOICE_HISTORY_LIMIT x INVOICE_HISTORY_PAGE_LIMIT`, reply root outside the scanned range or reply thread cap, Slack API rate limits, and Apps Script execution time limits.

## 2026-06-14 Version 37 Runtime/Rate Limit Guard

- Local static syntax check passed through Node UTF-8 parsing.
- Local synthetic `testResolveVinGroups()` passed with Logger mocked: `ok=true`, `actions=4`, `thread_id_actions=1`.
- `git diff --check` passed; only line-ending normalization warnings were reported by Git.
- `clasp push` succeeded, and both the self setup web deployment and API executable deployment were updated to version 37.
- Added `INVOICE_MAX_RUNTIME_SECONDS=300`; invoice monitoring stops before the Apps Script 6-minute execution ceiling and records deferred channel count in run stats.
- Invoice source channels are sorted by oldest `last_checked_at` first, so channels deferred by runtime limits are prioritized on the next run.
- Slack Web API HTTP 429 handling now reads `Retry-After` case-insensitively, waits up to 30 seconds, and retries once.
- Documented the current operating assumptions: about 6 monitored channels, low new-post volume, frequent old-thread replies, 1-hour delay acceptable, and both missed sends and false sends should be avoided.
- Documented that Slack Events API can provide near-instant invoice rocket forwarding, but vehicle/thread linking still needs scheduled crawling for past-thread comparison.

## 2026-06-14 Version 42 Slack Events Activation

- Web app manifest was changed to `ANYONE_ANONYMOUS` / `USER_DEPLOYING` so Slack can reach the Events API endpoint.
- Public admin actions are protected by `WEB_ADMIN_TOKEN`; Slack Events posts require `SLACK_EVENT_REQUEST_TOKEN` through the `slack_event_token` URL parameter.
- `SLACK_EVENT_REQUEST_TOKEN` and `WEB_ADMIN_TOKEN` were generated and saved in the settings sheet; the current Events URL is stored only in ignored local file `events-endpoint.local.json`.
- `upsertSetting_()` now updates the last matching settings row so duplicate setting keys cannot leave stale values winning over newer overrides.
- Slack `url_verification` now verifies the request token through Script Properties before touching Sheets, avoiding Slack verification timeouts.
- Local static syntax check passed through Node UTF-8 parsing.
- Local synthetic `testResolveVinGroups()` passed with Logger mocked: `ok=true`, `actions=4`, `thread_id_actions=1`.
- `clasp push` succeeded, and both the self setup web deployment and API executable deployment were updated to version 42.
- GAS status check confirmed `scheduled_trigger_count=1`, `scheduled_trigger_mode=every_1_hours`, `INVOICE_SOURCE_CHANNEL_NAMES=*`, `INVOICE_REPLY_THREAD_LIMIT=25`, and `INVOICE_FORCE_RESCAN_HOURS=3`.
- Slack App `A0B9TSCGZAR` Event Subscriptions were enabled in the Slack API UI.
- Slack Request URL verification showed `Verified`.
- Slack Bot Events includes `reaction_added` with required scope `reactions:read`.
- Slack Delayed Events is `On`, so Slack will retry missed event deliveries over 24 hours.

## Apps Script

- Script ID: `1tC2SUs8K5ptQFafRaRtTcnTqHWCeBhuLw16Lh9gaWQ4rNCogom5atXWb`
- Editor URL: `https://script.google.com/d/1tC2SUs8K5ptQFafRaRtTcnTqHWCeBhuLw16Lh9gaWQ4rNCogom5atXWb/edit`
- Setup deployment ID: `AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ` at version 42
- API executable deployment ID: `AKfycbzXdY8hkYQiCY_NQOpCulPcQiZFIoB2gY2DciaoIhkhFfJYi5uROG1dtHF2ng9b8UgVoA` at version 42
- Setup URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=setup`
- Status URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=status`
- Slack settings URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=slack`
- Joined channels URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=joined_channels`

## Current Verified Setup

- Spreadsheet exists: `1VIPGtfBKq6BiIp1Fc9cku5-_KvviNsKNuQhzWOd9g0s`
- Spreadsheet URL: `https://docs.google.com/spreadsheets/d/1VIPGtfBKq6BiIp1Fc9cku5-_KvviNsKNuQhzWOd9g0s/edit`
- Required sheets exist with valid headers.
- `DRY_RUN=true` for scheduled `main()` runs. The verified real Slack post was executed through the targeted `link_threads` action with `dry_run=false`.
- `PARENT_CHANNEL_NAME=依頼_車案件`.
- `CHILD_CHANNEL_NAMES=carmore依頼,オールマシンサービス`.
- `LOOKBACK_DAYS=60`.
- Last verified `scheduledMain()` trigger count: 1.
- Desired schedule: `MAIN_TRIGGER_INTERVAL_HOURS=1`.
- `SLACK_BOT_TOKEN` is saved.
- Invoice forwarding is enabled with `INVOICE_REPLY_THREAD_LIMIT=10`; current verified test forwarded one PDF from a thread reply and then skipped the duplicate on the next dry run.
- Invoice forwarding also supports rocket-marked messages without PDF files; those post the labeled source Slack link without forwarding a PDF file.
- Desired invoice runtime guard: `INVOICE_MAX_RUNTIME_SECONDS=300`.
- Slack Events API is active for `reaction_added`; hourly polling remains as a backup.
- Automatic internal Slack links use labeled text plus source-post attachment cards because Slack native unfurls can differ between manual shares and bot posts. Existing invoice posts were refreshed to the same format.

## Verified Slack App

- Workspace: `SEEMORE` (`T07G7LE7RDM`)
- Slack App ID: `A0B9TSCGZAR`
- Bot user auth passed.
- Target channels found and readable:
  - `依頼_車案件` (`C0AUXCQ58LU`)
  - `carmore依頼` (`C0AR6ERFRHS`)
  - `オールマシンサービス` (`C0AQMDYNP2B`)

## Remaining Verification

- If expected links are missing, add explicit `車体番号:` or `車台番号:` labels in the parent channel threads, or intentionally broaden the VIN extraction rule.
- Before setting `DRY_RUN=false`, run a fresh `?action=dryrun` after parent-side VIN labels exist and inspect `dry_run_logs`.

Additional current notes:

- Broad `?action=dryrun&lookback_days=365&max_threads_per_channel=300` can exceed Apps Script execution time because it scans all configured channels. Use `scan_labels` or targeted `link_threads` for manual verification of a known pair.
- Keep scheduled `DRY_RUN=true` until broad scheduled behavior is intentionally enabled. Before changing scheduled `DRY_RUN=false`, run a bounded dry run and inspect `dry_run_logs`.

## Slack App

Use `slack-app-manifest.yml` when creating the Slack App from manifest.

The manifest includes:

- Bot display name
- `channels:read`
- `channels:history`
- `groups:read`
- `groups:history`
- `reactions:read`
- `files:read`
- `chat:write`
