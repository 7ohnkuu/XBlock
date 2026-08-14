import assert from "node:assert/strict"
import test from "node:test"
import { resolveLocale, setLocale, t } from "./i18n.ts"

test("resolveLocale honors explicit choice", () => {
  assert.equal(resolveLocale("en"), "en")
  assert.equal(resolveLocale("zh-Hant"), "zh-Hant")
})

test("t interpolates and switches language", () => {
  setLocale("en")
  assert.equal(t("tray.stop"), "Stop")
  assert.equal(t("tray.start", { count: 3 }), "Start blocking 3")
  setLocale("zh-Hant")
  assert.equal(t("tray.stop"), "停止")
})
