# SEEMORE Slack GAS Linker Setup Status

Last updated: 2026-06-11 22:58 JST

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
- The Slack App manifest was copied to the Windows clipboard for pasting into Slack's app manifest flow.
- Slack App manifest was prepared at `slack-app-manifest.yml`.

## Apps Script

- Script ID: `1tC2SUs8K5ptQFafRaRtTcnTqHWCeBhuLw16Lh9gaWQ4rNCogom5atXWb`
- Editor URL: `https://script.google.com/d/1tC2SUs8K5ptQFafRaRtTcnTqHWCeBhuLw16Lh9gaWQ4rNCogom5atXWb/edit`
- Setup deployment ID: `AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ` at version 5
- Setup URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=setup`
- Status URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=status`
- Slack settings URL: `https://script.google.com/macros/s/AKfycbxaMhYnSz4l3lnUkPVeF6ZdR3DGYxryafwyT9pfGb5deveGsJ2N8mXjwTyHUrUr9fTArQ/exec?action=slack`

## Current Verified Setup

- Spreadsheet exists: `1VIPGtfBKq6BiIp1Fc9cku5-_KvviNsKNuQhzWOd9g0s`
- Spreadsheet URL: `https://docs.google.com/spreadsheets/d/1VIPGtfBKq6BiIp1Fc9cku5-_KvviNsKNuQhzWOd9g0s/edit`
- Required sheets exist with valid headers.
- `DRY_RUN=true`.
- `PARENT_CHANNEL_NAME=依頼_車案件`.
- `CHILD_CHANNEL_NAMES=carmore依頼,オールマシンサービス SEEMORE`.
- `LOOKBACK_DAYS=60`.
- `main()` trigger exists: 1.
- `SLACK_BOT_TOKEN` is not saved yet.

## Next Verification

After the Slack App is created and the Bot Token is saved, verify:

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
