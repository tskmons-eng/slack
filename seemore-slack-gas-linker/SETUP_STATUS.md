# SEEMORE Slack GAS Linker Setup Status

Last updated: 2026-06-11 22:43 JST

## Completed

- Google `clasp` login completed as `tsk.mons@gmail.com`.
- Apps Script API was enabled for the Google account.
- Apps Script project was created.
- `Code.gs` and `appsscript.json` were pushed to Apps Script.
- Versioned deployments were created.
- A self-only web setup endpoint was deployed.
- Slack App manifest was prepared at `slack-app-manifest.yml`.

## Apps Script

- Script ID: `1tC2SUs8K5ptQFafRaRtTcnTqHWCeBhuLw16Lh9gaWQ4rNCogom5atXWb`
- Editor URL: `https://script.google.com/d/1tC2SUs8K5ptQFafRaRtTcnTqHWCeBhuLw16Lh9gaWQ4rNCogom5atXWb/edit`
- Setup deployment ID: `AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ`
- Setup URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=setup`

## Waiting On User Authorization

Chrome is currently showing `Authorization needed`.

User action required:

1. In the Chrome authorization window, continue the Google permission flow.
2. Allow the script permissions.
3. Wait for the setup completion page.

After authorization, the script should create the spreadsheet `SEEMORE_Slack車案件リンク管理`, initialize the required sheets, and create the daily 03:00 trigger.

## Next Verification

After the user authorizes the script, verify:

- Google Drive contains `SEEMORE_Slack車案件リンク管理`.
- The spreadsheet has `settings`, `linked_threads`, `run_logs`, `errors`, and `dry_run_logs`.
- `settings` contains the default values and `DRY_RUN=true`.
- Apps Script triggers include daily `main()` around 03:00.
- `SLACK_BOT_TOKEN` is entered and `testSlackAuth()` passes.
- `testFindChannels()` finds `依頼_車案件`, `carmore依頼`, and `オールマシンサービス SEEMORE`.

## Slack App

Use `slack-app-manifest.yml` when creating the Slack App from manifest.

The manifest includes:

- Bot display name
- `channels:read`
- `channels:history`
- `groups:read`
- `groups:history`
- `chat:write`
- `search:read`
