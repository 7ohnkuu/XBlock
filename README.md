# XBlock

Hide promo, copy-paste farm, and adult/scam reply bots on X status pages. Confirm blocks with X’s own dialog. All data stays on this machine.

Current release: **[v1.0.7](https://github.com/7ohnkuu/XBlock/releases/tag/v1.0.7)**. License: [MIT](LICENSE).

## What it does

On a single `x.com/.../status/...` thread:

- Scan replies against a local word list (Simplified + Traditional), display names, extra `@` mentions, and farm-handle patterns
- Hide matching accounts first so the thread is readable
- Review suggestions in the tray: check, mark as human, open a profile
- Start a queue that opens X’s native **Block** dialog — you click the final Block

It does **not** run on Home, Notifications, Search, or Messages. It does **not** auto-block, auto-report, or call unofficial X APIs. Lists and word banks stay in `chrome.storage.local`; import/export is a file on this computer, not a subscribed blocklist.

Design contract: [DESIGN.md](DESIGN.md). Domain language: [CONTEXT.md](CONTEXT.md). Changes: [CHANGELOG.md](CHANGELOG.md).

## Install (Chrome, unpacked)

1. Download [`xblock-1.0.7.zip`](https://github.com/7ohnkuu/XBlock/releases/latest) from [Releases](https://github.com/7ohnkuu/XBlock/releases) and unzip it.
2. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the unzipped folder (the one that contains `manifest.json`).
3. Open any status thread. The XBlock chip is at the bottom right. The toolbar icon opens Options (language: follow browser, 中文, or English).

Upgrade: unzip the new zip, click **Reload** on the extension card, then **refresh** every open x.com tab. Reloading the extension without refreshing the tab leaves a dead content script; 1.0.6 shows a banner instead of throwing.

## Build from source

```bash
npm install
npm test
npm run build
```

Then Load unpacked → `dist/`.

## Options

- Toggle promo / adult-scam / cross-post / extra-`@` / slow “Show more replies”
- Edit word lists; reset seed words without dropping words you added
- Pending / blocked mirror / human-exempt lists
- Import and export words, lists, or a full backup

## License

[MIT](LICENSE) © 2026 john
