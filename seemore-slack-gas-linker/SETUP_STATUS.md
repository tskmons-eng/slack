# SEEMORE Slack GAS Linker Setup Status

Last updated: 2026-06-12 01:48 JST

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

## Apps Script

- Script ID: `1tC2SUs8K5ptQFafRaRtTcnTqHWCeBhuLw16Lh9gaWQ4rNCogom5atXWb`
- Editor URL: `https://script.google.com/d/1tC2SUs8K5ptQFafRaRtTcnTqHWCeBhuLw16Lh9gaWQ4rNCogom5atXWb/edit`
- Setup deployment ID: `AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ` at version 25
- API executable deployment ID: `AKfycbzXdY8hkYQiCY_NQOpCulPcQiZFIoB2gY2DciaoIhkhFfJYi5uROG1dtHF2ng9b8UgVoA` at version 21
- Setup URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=setup`
- Status URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=status`
- Slack settings URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=slack`

## Current Verified Setup

- Spreadsheet exists: `1VIPGtfBKq6BiIp1Fc9cku5-_KvviNsKNuQhzWOd9g0s`
- Spreadsheet URL: `https://docs.google.com/spreadsheets/d/1VIPGtfBKq6BiIp1Fc9cku5-_KvviNsKNuQhzWOd9g0s/edit`
- Required sheets exist with valid headers.
- `DRY_RUN=true` for scheduled `main()` runs. The verified real Slack post was executed through the targeted `link_threads` action with `dry_run=false`.
- `PARENT_CHANNEL_NAME=依頼_車案件`.
- `CHILD_CHANNEL_NAMES=carmore依頼,オールマシンサービス`.
- `LOOKBACK_DAYS=60`.
- `main()` trigger exists: 1.
- `SLACK_BOT_TOKEN` is saved.

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
- `chat:write`
