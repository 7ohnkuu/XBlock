import assert from "node:assert/strict"
import test from "node:test"
import { handleFromHref } from "./extract.ts"

test("handle from relative and absolute profile/status hrefs", () => {
  assert.equal(handleFromHref("/alice_01"), "alice_01")
  assert.equal(handleFromHref("https://x.com/alice_01"), "alice_01")
  assert.equal(handleFromHref("https://x.com/alice_01/status/1234567890"), "alice_01")
  assert.equal(handleFromHref("https://twitter.com/foo/status/1"), "foo")
  assert.equal(handleFromHref("https://www.x.com/foo"), "foo")
  assert.equal(handleFromHref("/i/status/1"), null)
  assert.equal(handleFromHref("/home"), null)
  assert.equal(handleFromHref("https://t.co/abc"), null)
})
