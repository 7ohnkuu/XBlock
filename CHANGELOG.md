# Changelog

## 1.0.7 — 2026-08-14

Deepen hide / suggest / ignore, account identity, and the page loop.

- Farm handle is its own tray signal (`farm`), not a drain reason; it still hides when another spam hit fires
- Handle-only import rows are bind candidates (`unresolved:handle`) and no longer D2-hide until bound to a rest_id
- Native Block queue no longer pauses hide / suggest; only slow-expand pauses
- Tray keeps your checks across a rescan; ranking and the 15-cap live next to the tray
- Classifier no longer re-parses `@` from the body — extract is the source of mentions

## 1.0.6 — 2026-08-14

Ship since 1.0.1: nickname ads, tray scrolling, Options, and reload safety.

- Display-name meetup / “tap avatar” seeds (`点头像`, `线下约见`, `同城无偿`, …); seed revision 7 merges them on upgrade
- Tray suggestion list has a fixed height, keeps scroll position, and no longer eats the wheel before the list
- Options opens through the service worker with `tabs.create` (page-context `chrome-extension://` links are blocked)
- After an extension reload, the orphaned content script stops calling `chrome.*` and shows a refresh banner instead of “Extension context invalidated”

## 1.0.1 — 2026-08-14

Classifier tighten from the first audit.

- Extra @mentions stay in the tray; they no longer auto-hide or open the near-dup gate
- Cross-post fingerprints strip @handles on both read and write
- Farm handles (Latin + 5+ digits, including `_` / leading digits) are a weak signal: tray only unless another spam hit fires

## 1.0.0 — 2026-08-14

First public release.

- Hide promo, copy-paste farm, and adult/scam reply bots on X status pages
- Local word lists, display-name matching, extra @mention rules, farm-handle heuristics
- Tray review: check, mark as human, open profiles, then native X Block dialogs
- Import/export for word lists and block/exempt lists
- Chinese and English UI (follow browser, or lock in Options)
- Manifest V3, on-device only; does not send Block or Report on your behalf
