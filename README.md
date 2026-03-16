# WhatsApp Workshop Sender

Chrome Extension (Manifest V3) to send personalized WhatsApp Web messages in controlled batches.

Main capabilities:
- Import contacts from `xlsx/xls`
- Auto-detect tags from spreadsheet columns
- Filter contacts by a single selected tag (required to run)
- Send in chunks of 100 contacts
- Personalize message templates with variables
- Track per-contact results and filter results by `OK` / `ERR`

## Overview

This is no longer an Angular app. It is a browser extension built with:
- React (popup/options UI)
- TypeScript
- esbuild
- `xlsx` for file parsing

Core runtime pieces:
- `popup`: campaign setup and run controls
- `background`: batch orchestration and progress events
- `content`: WhatsApp Web DOM automation (search, open chat, compose, send)
- `options`: runtime settings (send delay)

## Project Structure

Key files:
- `manifest.json`: extension permissions, entry points, content script
- `src/build.mjs`: build script (esbuild)
- `src/popup/index.tsx`: popup UI
- `src/popup/styles.css`: popup styling
- `src/background.ts`: batch sender loop
- `src/content.ts`: WhatsApp Web automation logic
- `src/options/index.tsx`: settings page
- `src/shared/xlsx.ts`: contact import and mapping logic

Build output:
- `dist/`

## Requirements

- Node.js 18+
- npm
- Google Chrome (or Chromium-based browser with extension support)
- An active logged-in `https://web.whatsapp.com` tab

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

Watch mode:

```bash
npm run watch
```

## Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `dist/` folder

After rebuilding, click the refresh icon on the extension card in `chrome://extensions/`.

## How to Use

1. Open `https://web.whatsapp.com` and keep the tab focused during sending.
2. Open extension popup.
3. Import your spreadsheet (`.xlsx` or `.xls`).
4. Select exactly one tag (required).
5. Choose chunk range (100 contacts per run).
6. Write/edit your message template.
7. Click `Start run`.
8. Review results (`OK`/`ERR`) and use result counter filters.

## Template Variables

Supported variables in popup template:
- `{{name}}`
- `{{phone}}`
- `{{email}}`

## Spreadsheet Format

The importer normalizes headers and supports common aliases.

Name columns (examples):
- `fullname`, `full_name`, `name`, `nombre`

Phone columns (examples):
- `mobile_phone`, `mobile_1`, `mobile`, `phone`, `phone_number`, `telefono`

Notes:
- Contacts without name or phone are skipped.
- Tag columns are inferred from non-reserved columns where values are truthy (`1`, `si`, `yes`, `true`, `x`, etc.).

## Sending Logic

- Contacts are searched by phone suffix (last 8 digits).
- One message at a time, sequentially.
- Delay between sends comes from Options (`delayMs`, minimum 200 ms).
- Progress events stream back to popup per contact.

## Settings

Options page currently exposes:
- `Delay between messages (ms)`

Open from popup via `Settings` button.

## Known Limitations

- WhatsApp Web DOM changes can break selectors/click automation.
- Searching by last 8 digits can be ambiguous in some datasets.
- UI automation is inherently less stable than API-based delivery.

## Troubleshooting

If contacts are not opening:
- Ensure WhatsApp Web tab is active and focused.
- Reload WhatsApp Web and retry.
- Rebuild and reload extension.

If import says 0 contacts:
- Verify the sheet has recognizable name/phone headers.
- Check phone cells are not empty.

If popup layout looks broken:
- Rebuild and reload extension.
- Confirm `dist/popup.css` is loaded.

## Safety and Operational Guidance

- Start with small test batches before large runs.
- Use conservative delays to reduce UI/race failures.
- Monitor results and rerun only failed contacts.

## Scripts

From `package.json`:

```bash
npm run build   # one-time build
npm run watch   # rebuild on file changes
```
