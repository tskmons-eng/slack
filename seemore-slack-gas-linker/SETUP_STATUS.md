# SEEMORE Slack GAS Linker Setup Status

Last updated: 2026-08-02 00:30 JST

## 2026-08-02 Vehicle link automatic posting

- Added admin-token-protected, confirmation-token-gated actions to change only the vehicle-link `DRY_RUN` setting and to run only vehicle/thread linking without invoking invoice, UFO, generic reaction, or vehicle-monitoring phases.
- Changed the production setting from `DRY_RUN=true` to `DRY_RUN=false`. The parent remains `依頼_車案件`; all five configured children remain `carmore依頼`, `オールマシンサービス`, `依頼_all`, `電話対応`, and `依頼_振込`.
- The pre-switch 60-day, 20-threads-per-channel dry run checked 3 parent threads, found 2 link keys and 1 child match, planned 2 posts, and finished with zero errors, no deferred channels, and no deadline stop.
- The production-only run posted 2 Slack replies with zero errors: one same-VIN parent-thread link and one `電話対応` related-request link. Slack search visibly confirmed both app posts at 00:17 JST on 2026-08-02.
- Immediate repeated production runs posted 0 additional replies and skipped both actions as duplicates (`duplicate_skipped_count=2`, `error_count=0`).
- Added a `ScriptLock` around the final duplicate recheck, Slack post, and `linked_threads` save so an hourly `scheduledMain()` and a manual vehicle-link run cannot pass the duplicate check concurrently.
- Local UTF-8 syntax, full synthetic link-logic tests, locked-post static verification, and `git diff --check` passed. A second code review found no remaining P1/P2 issue.
- Pushed the source and published GAS version 77 to both the Slack Events Web App and API executable deployments.
- The deployed version 77 Web logic test returned `ok=true`, `actions=7`, `thread_id_actions=1`, and all five configured child channel names.
- Final production status confirmed `DRY_RUN=false`, one hourly `scheduledMain` trigger, and both existing invoice/UFO routes still enabled. No unrelated routing setting was changed.

## 2026-08-01 Vehicle link channel expansion

- Added `依頼_all` (`C0APZAXLYGK`), `電話対応` (`C0BF7K48W8L`), and `依頼_振込` (`C0BLT86MFQS`) as vehicle/thread-link child channels while retaining `carmore依頼` and `オールマシンサービス`.
- The parent remains `依頼_車案件` (`C0AUXCQ58LU`). `依頼_振込` keeps its existing UFO forwarding destination role; only the independent vehicle-link scan scope was expanded.
- Added the admin-protected `set_vehicle_link_channels` action. It validates Bot membership for every child and rejects the parent as a child before updating `CHILD_CHANNEL_NAMES`.
- Local UTF-8 syntax and synthetic tests passed with `ok=true`, `actions=7`, `thread_id_actions=1`, and all five child channel names. The isolated management-action test also passed with `child_count=5`.
- Pushed the source to Apps Script and published GAS version 75 to both the Slack Events Web App and API executable deployments.
- The production setting update returned `ok=true` and resolved all five child channels to the expected Slack IDs.
- A production dry run using the scheduled vehicle-link bounds (`lookback_days=60`, `max_threads_per_channel=20`) completed with 3 parent threads checked, 2 link keys, 1 child match, 2 planned posts, `posted_count=0`, `deadline_reached=false`, `channels_deferred=0`, and `error_count=0`.
- Final production status confirmed `DRY_RUN=true`, the five-child setting, one hourly `scheduledMain` trigger, and both existing invoice/UFO routes still enabled. Vehicle-link matching is healthy, but automatic Slack posting remains intentionally disabled until the user explicitly changes `DRY_RUN=false`.

## 2026-07-30 UFO reaction forwarding

- Implemented `invoice_forward_routes` with independent initial routes:
  - `invoice_rocket / rocket / 依頼＿請求書`
  - `payment_ufo / flying_saucer / 依頼_振込`
- Both routes share the explicit five-source setting and inspect root posts plus thread replies through immediate Slack Events and hourly recovery.
- PDF candidates keep the existing file-name/date plus source-link format; candidates without a PDF forward only the source link.
- Duplicate history now includes the destination channel, so each route can forward the same source message once without cross-route suppression.
- Scheduled scan state includes a route signature. Route changes force a rescan, and an incomplete scan restores the previous signature.
- Source and target resolution is partial: an unresolved channel is recorded while other valid sources/routes continue.
- Added protected route update, route-specific dry-run/run, channel recovery, and one-message recovery actions.
- Local UTF-8 syntax and synthetic tests pass for route parsing, `flying_saucer` normalization, target-aware dedupe, legacy-row fallback, root/reply handling, route seeding, route disable input, route-signature changes, and partial source resolution.
- Slack preflight confirmed `依頼_振込` (`C0BLT86MFQS`) contains `SEEMORE Vehicle Thread Linker`.
- Slack preflight confirmed `依頼_引き継ぎ` (`C0B64F0HC5Q`) was archived on 2026-07-29. On 2026-07-30 the user explicitly chose to leave it archived and exclude it from active monitoring, so the production acceptance target is five sources.
- Fixed the recovery cursor so an incremental new-message scan preserves the previous `last_full_scan_at`; frequent new roots can no longer postpone recovery of an older missed reaction indefinitely.
- Migrated `INVOICE_FORCE_RESCAN_HOURS` from `3` to `1`, matching the hourly recovery requirement. Existing `6` or `3` values migrate to `1` during setup.
- `scheduledMain()` now includes child-phase `error_count` values in its top-level audit count while still allowing other sources and routes to continue.
- Published GAS version 74 to both the Slack Events Web App and API executable deployments.
- Production status confirmed one `scheduledMain` trigger in `every_1_hours` mode, five configured/resolved sources, two enabled routes, `INVOICE_FORCE_RESCAN_HOURS=1`, and zero unresolved sources or targets.
- Live UFO verification completed for a PDF root post, a link-only root post, and a thread reply. All three arrived in `依頼_振込`.
- Slack Event Subscriptions was found disabled, re-enabled, saved, and rechecked as `Enable Events=On`, Request URL `Verified`, Delayed Events `On`, with Bot Events `reaction_added` and `message.groups`.
- A fresh root UFO then arrived through the natural Slack Events path without a manual recovery call.
- Removing and re-adding the test UFO did not add another target post. A version 74 Events replay returned `posted_count=0`, `duplicate_skipped_count=1`, and `error_count=0`.
- Version 74 route dry-runs checked five sources, 30 root messages, and 241 replies. UFO found 4 existing candidates and rocket found 5; all were recognized as duplicates with zero errors.
- The final version 74 `scheduledMain()` production run completed in 23 seconds with `completed=true`, `deadline_reached=false`, and `error_count=0`.

## 2026-07-27 Scheduled runtime recovery

- Confirmed that this Slack automation uses Google Apps Script, Google Sheets, and Slack Web API. It does not depend on the stopped Google Cloud Run/billing workload, so ownership remains with `tsk.mons@gmail.com`; no Google account migration was performed.
- Apps Script execution history showed `scheduledMain` timing out at about 360 seconds on every hourly run. The Slack Events Web App still responded, so direct `reaction_added` handling remained available while scheduled recovery was unhealthy.
- Root cause was the unbounded legacy vehicle-thread scan running before invoice/reaction recovery, compounded by full sheet setup work during each Slack API request.
- Scheduled processing now runs invoice recovery first, then generic reaction recovery, vehicle watch sync, and finally a bounded vehicle-thread scan.
- The whole scheduled run has a 300-second deadline. Invoice recovery gets up to 150 seconds, generic reaction recovery and vehicle watch sync get 45 seconds each, and the vehicle-thread scan uses the remaining time with at most 20 roots per configured channel.
- Slack API calls now read the Bot Token from Script Properties and no longer initialize and resize every management sheet per request.
- Added protected Web action `?action=scheduled_run&confirm=RUN_SCHEDULED_MAIN` and `scheduled_run_logs` audit sheet.
- Published GAS version 71 to both active Web App deployments.
- A production manual run completed in 41 seconds with `error_count=0` and no deadline stop. It recovered 3 previously unprocessed invoice rockets and 1 previously unprocessed assistant reaction; 2 invoice and 4 assistant records were correctly skipped as duplicates.
- The next hourly trigger started at 2026-07-27 19:20:35 JST and completed normally in 28.577 seconds. Its audit row recorded `completed=true`, `deadline_reached=false`, and `error_count=0`.
- Production status at 2026-07-27 19:22:57 JST confirmed one `scheduledMain` trigger, a valid `scheduled_run_logs` header, invoice forwarding enabled, and one enabled generic reaction rule.

## 2026-07-13 Vehicle management integration

- Added an isolated `message.groups` path for private channel `C0BGT2E75CJ` (`のっちゃリーナ`). Existing invoice and reaction forwarding branches are unchanged.
- Vehicle API settings are stored separately and enabled only after admin-token validation. The HMAC secret fingerprint matches the XServer vehicle application.
- Published GAS version 67 to both active Web App deployments.
- Live signed connectivity test returned `ok=true` and `review_state=pending_review`. Unsigned requests remain rejected by the vehicle API.
- Only `SEEMORE_SHARE_ID` plus channel/thread identifiers and a fixed safe summary are sent. Slack message text and vehicle/customer financial data are not forwarded.
- Vehicle monitoring now reads the signed `active-watches` API independently from invoice and reaction forwarding. It registers the Slack permalink, sends only fixed summaries and status candidates, performs one final thread sync for `closing`, then sends `close_acknowledged` so the vehicle app can stop monitoring.
- Closed watches are absent from scheduled polling. Message text remains in Slack; the vehicle API receives only share/channel/thread/message identifiers, fixed summaries, and a limited status candidate.

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

## 2026-07-04 Version 46 Assistant Article Reaction Forwarding

- Added generic reaction forwarding alongside the existing invoice rocket forwarding.
- New `reaction_forward_rules` sheet controls source channel, reaction name, target channel, `copy_text` mode, and whether to include the source link.
- New `reaction_forward_posts` sheet records forwarded source message, reaction, target channel, posted timestamp, and copied text to prevent duplicates.
- `reaction_added` now evaluates generic forwarding rules before/alongside invoice forwarding, so non-rocket assistant article stamps no longer get ignored.
- `scheduledMain()` now also runs a backup generic reaction-forwarding scan over enabled rules.
- Added public `runReactionForwardDryRunNow()` and Web `?action=reaction_forward_dryrun` for no-post candidate checks.
- Rich text inline elements are preserved inline when copying Slack block text.
- Local static syntax check passed through Node UTF-8 parsing.
- Local synthetic `testResolveVinGroups()` passed with Logger mocked and now includes rule parsing, text extraction, and duplicate-row checks for reaction forwarding.
- `clasp push` succeeded, versions 44 through 46 were created during implementation, and both the setup web deployment and API executable deployment were updated to version 46.
- Web `?action=status` confirmed `reaction_forward_rules` and `reaction_forward_posts` exist with valid headers, `scheduled_trigger_count=1`, `reaction_forward_rule_count=1`, and `reaction_forward_enabled_rule_count=0`.
- The initial `assistant_articles` rule is intentionally disabled until the user-created stamp and target channel are filled in and `enabled=true` is set.

## 2026-07-04 Version 47 Reaction Forward Rule Admin Action

- Added admin-protected Web action `?action=set_reaction_forward_rule&confirm=UPDATE_REACTION_FORWARD_RULE` to update one `reaction_forward_rules` row without directly editing the sheet.
- `reaction_name` is normalized the same way as runtime matching, so both `輪っか` and `:輪っか:` are stored as `輪っか`.
- Local static syntax check passed through Node UTF-8 parsing.
- Local synthetic `testResolveVinGroups()` passed with Logger/Utilities/Session mocked: `ok=true`, `actions=4`, `thread_id_actions=1`.
- `clasp push` succeeded, version 47 was created, and both the setup web deployment and API executable deployment were updated to version 47.
- The production `assistant_articles` rule was updated to `enabled=true`, `source_channel_name=アシスタント`, `reaction_name=輪っか`, `target_channel_name=電話対応`, `post_mode=copy_text`, and `include_source_link=false`.
- Web `?action=status` confirmed `reaction_forward_rule_count=1` and `reaction_forward_enabled_rule_count=1`.
- Web `?action=reaction_forward_dryrun` completed with `ok=true`, `messages_checked=43`, `candidates_found=0`, `planned_count=0`, `posted_count=0`, and `error_count=0`.
- `candidates_found=0` is expected when `:輪っか:` was posted as a standalone message. The transfer starts when `輪っか` is added as a reaction to the specific assistant summary post.

## 2026-07-04 Version 48 Reaction Forwarding Diagnostics

- Added `slack_reaction_events` sheet to record each received Slack reaction event's stamp name, source channel, message TS, matched rule count, invoice routing flags, result reason, and posting counters. It does not store message bodies or tokens.
- Added admin-protected Web action `?action=diagnostics` to return setup status, Bot-joined key channels, reaction forwarding rules, recent reaction events, recent errors, recent reaction-forward posts, and invoice scan state.
- Local static syntax check passed through Node UTF-8 parsing.
- Local synthetic `testResolveVinGroups()` passed with Logger/Utilities/Session mocked: `ok=true`, `actions=4`, `thread_id_actions=1`.
- `clasp push` succeeded, version 48 was created, and both the setup web deployment and API executable deployment were updated to version 48.
- Web `?action=diagnostics` returned `ok=true`, `scheduled_trigger_count=1`, `invoice_forward_enabled=true`, `reaction_forward_enabled_rule_count=1`, and confirmed Bot membership in `アシスタント`, `電話対応`, and `依頼_請求書`.
- `recent_reaction_events` was empty immediately after deployment because the failed `輪っか` attempt happened before event logging existed and the user removed the reaction.
- A broad `?action=invoice_dryrun` can take too long with `INVOICE_SOURCE_CHANNEL_NAMES=*` now that the Bot is in more channels. Use `?action=diagnostics` for quick health checks and reserve invoice dry runs for targeted investigation.

## 2026-07-04 Versions 49-51 Assistant Curly Loop Fix

- Added admin-protected `?action=channel_reactions` to inspect Slack API reaction names on recent `アシスタント` messages and replies.
- `?action=channel_reactions&limit=15` showed the user-visible "輪っか" reaction is Slack API reaction name `curly_loop` on source message `1783129012.066479`.
- Updated production `assistant_articles` rule from `reaction_name=輪っか` to `reaction_name=curly_loop`.
- `?action=reaction_forward_dryrun` then returned `candidates_found=1`, `planned_count=1`, and `error_count=0`.
- Added admin-protected `?action=reaction_forward_run&confirm=RUN_REACTION_FORWARD` for manual production execution of generic reaction forwarding.
- Manual `?action=reaction_forward_run&confirm=RUN_REACTION_FORWARD` posted one copied assistant summary to `電話対応`: `posted_count=1`, `posted_ts=1783149157.319239`, `error_count=0`.
- Web `?action=diagnostics` confirmed `reaction_forward_posts` contains the production row with `reaction_name=curly_loop`, target channel `電話対応`, and `dry_run=false`.

## 2026-07-30 Slack Events Re-enabled

- Chrome verification of Slack App `A0B9TSCGZAR` showed Event Subscriptions `Enable Events` was `Off`, while the Request URL matched the current GAS Events URL and was `Verified`.
- Re-enabled Event Subscriptions from the Slack API UI and saved the app configuration.
- Post-save verification showed `Enable Events=On`, Request URL still `Verified`, Delayed Events `On`, and Bot Event `reaction_added` present with required scope `reactions:read`.
- This fixes the immediate `reaction_added` delivery path. The one-hour backup scan remains enabled as a fallback.

## Apps Script

- Script ID: `1tC2SUs8K5ptQFafRaRtTcnTqHWCeBhuLw16Lh9gaWQ4rNCogom5atXWb`
- Editor URL: `https://script.google.com/d/1tC2SUs8K5ptQFafRaRtTcnTqHWCeBhuLw16Lh9gaWQ4rNCogom5atXWb/edit`
- Setup deployment ID: `AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ` at version 74
- API executable deployment ID: `AKfycbzXdY8hkYQiCY_NQOpCulPcQiZFIoB2gY2DciaoIhkhFfJYi5uROG1dtHF2ng9b8UgVoA` at version 74
- Setup URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=setup`
- Status URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=status`
- Slack settings URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=slack`
- Joined channels URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=joined_channels`

## Current Verified Setup

- Spreadsheet exists: `1VIPGtfBKq6BiIp1Fc9cku5-_KvviNsKNuQhzWOd9g0s`
- Spreadsheet URL: `https://docs.google.com/spreadsheets/d/1VIPGtfBKq6BiIp1Fc9cku5-_KvviNsKNuQhzWOd9g0s/edit`
- Required sheets exist with valid headers.
- `reaction_forward_rules` and `reaction_forward_posts` exist with valid headers.
- `reaction_forward_rules` contains one enabled `assistant_articles` rule: `アシスタント` + Slack API reaction `curly_loop` -> `電話対応`, `copy_text`, `include_source_link=false`.
- `DRY_RUN=true` for scheduled `main()` runs. The verified real Slack post was executed through the targeted `link_threads` action with `dry_run=false`.
- `PARENT_CHANNEL_NAME=依頼_車案件`.
- `CHILD_CHANNEL_NAMES=carmore依頼,オールマシンサービス`.
- `LOOKBACK_DAYS=60`.
- Last verified `scheduledMain()` trigger count: 1.
- Verified schedule: `MAIN_TRIGGER_INTERVAL_HOURS=1`.
- `SLACK_BOT_TOKEN` is saved.
- Invoice forwarding is enabled with `INVOICE_REPLY_THREAD_LIMIT=25` and `INVOICE_FORCE_RESCAN_HOURS=1`.
- `invoice_forward_routes` contains enabled `invoice_rocket` and `payment_ufo` routes. Both support root/reply messages, PDF forwarding, and link-only fallback.
- Verified invoice runtime guard: `INVOICE_MAX_RUNTIME_SECONDS=300`.
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

## 2026-07-04 Assistant Article Formatting

- Reaction forwarding now builds Slack `text` plus sanitized Slack `blocks` for `copy_text` posts.
- Supported copied block types: `section`, `header`, `context`, `divider`, `rich_text`, and `image`.
- Non-text interactive parts such as buttons and inputs are not copied into forwarded article posts.
- When a forwarded summary includes a `要約` section and at least two headings or section labels such as `次の対応`, the forwarder inserts a `目次` block in the target post.
- Link-only labels such as `リンク` are excluded from the generated `目次`.
- If Slack rejects copied blocks, the script records an error and falls back to a text-only post so forwarding does not stop.
- Added `?action=refresh_reaction_forward_posts&confirm=RUN_REACTION_FORWARD&limit=1` to update the most recent forwarded article post in place from the original source message.
- If the existing target message has been deleted and Slack returns `message_not_found`, the refresh action reposts the formatted message and replaces the stored `posted_ts`.
- Deployed GAS version 54 to the active Slack Events Web App deployment.
- Production refresh verification:
  - First refresh found the latest stored target message missing and reposted it with blocks: `reposted_count=1`, `blocks_used_count=1`, `blocks_fallback_count=0`.
  - `電話対応` then showed the new forwarded post at `1783172263.804869`.
  - Second refresh updated that stored post in place: `updated_count=1`, `reposted_count=0`, `blocks_used_count=1`.
- Deployed GAS version 55 to add summary TOC generation.
- Refreshed the latest `電話対応` forwarded post again after version 55: `updated_count=1`, `blocks_used_count=1`, `blocks_fallback_count=0`.
- `電話対応` preview confirmed the forwarded post now starts with `*目次* 1. 要約 2. 次の対応`.

## 2026-07-05 Assistant Article Reply Forwarding

- Reaction forwarding now copies Slack thread replies that exist when the source post is transferred.
- Forwarded comments are posted as replies under the target parent post, preserving text and supported Slack blocks where possible.
- Reply forwarding is capped at 20 source replies; when more exist, the target thread gets an omitted-count notice.
- Added `source_reply_count`, `posted_reply_count`, and `reply_error_count` to `reaction_forward_posts`.
- `refresh_reaction_forward_posts` can add source replies for older forward rows where `posted_reply_count` is blank or `0`.
- Deployed GAS version 56 to the active Slack Events Web App deployment.
- Web `status` confirmed `reaction_forward_posts` header is valid after adding reply audit columns.
- `channel_reactions` checked the latest 20 `アシスタント` messages; none had Slack thread replies, so live comment-forward verification remains pending until a commented source post exists.

## 2026-07-10 Invoice Rocket Recovery

- Root cause of delayed invoice forwarding: `INVOICE_SOURCE_CHANNEL_NAMES=*` included newly joined non-invoice channels `アシスタント` and `電話対応`. The assistant channel alone consumed one broad scan before invoice channels were reached.
- Updated the production invoice source setting to the six request channels: `carmore依頼`, `オールマシンサービス`, `依頼_all`, `依頼_引き継ぎ`, `依頼_車案件`, and `依頼＿小売取引`.
- The former `依頼_米取引` channel was renamed in Slack to `依頼＿小売取引`; the production setting was updated successfully after verifying the renamed channel through the Bot API.
- Added a 120-second safety reserve inside invoice history and thread-reply scanning. The run returns deferred-state data instead of losing its result to the Web execution timeout.
- Added admin-protected targeted recovery actions: `invoice_run_channel` forces a 30-day rescan for one source channel, and `invoice_run_message` forwards one identified root post or thread reply.
- Deployed GAS version 60 to both active Web App deployments.
- Production recovery checks completed without API errors: four request channels had no rocket candidates in the 30-day window; a 365-day scan of `依頼_all` checked 287 root posts and 75 replies with no candidate before its safe time boundary.
- `依頼_米取引` had two visible rocket reactions in one thread, but both were already in `invoice_reaction_posts`; direct recovery correctly returned `duplicate_skipped_count=1` for each rather than posting duplicates.
- A still-missing rocket older than the scanned history pages needs its Slack post URL or its source channel and thread location for direct recovery. The new `invoice_run_message` action is available for that case.
