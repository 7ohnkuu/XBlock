# Changelog

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
