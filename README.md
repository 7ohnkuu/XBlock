# XBlock

Hide promo, copy-paste farm, and adult/scam reply bots on X status pages. Confirm blocks with X’s own dialog. All data stays on this machine.

Design contract: [DESIGN.md](DESIGN.md).

Current release: **v1.0.1**.

## Install (Chrome, unpacked)

From a [GitHub Release](https://github.com/7ohnkuu/XBlock/releases): download `xblock-1.0.1.zip`, unzip it.

Or build from source:

```bash
npm install
npm test
npm run build
```

Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select the unzipped folder or `dist/`.

Open any `x.com/.../status/...` thread. The XBlock chip appears at the bottom right. It does not run on Home or Notifications. The toolbar icon opens Options (language: follow browser, 中文, or English).
