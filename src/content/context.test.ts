import assert from "node:assert/strict"
import test from "node:test"
import { isContextError, runtimeAlive } from "./context.ts"

test("runtimeAlive requires a non-empty extension id", () => {
  assert.equal(runtimeAlive(undefined), false)
  assert.equal(runtimeAlive(null), false)
  assert.equal(runtimeAlive({}), false)
  assert.equal(runtimeAlive({ id: "" }), false)
  assert.equal(runtimeAlive({ id: "abcdefgh" }), true)
})

test("isContextError matches Chrome's invalidated-context message", () => {
  assert.equal(isContextError(new Error("Extension context invalidated")), true)
  assert.equal(isContextError(new Error("Uncaught Error: Extension context invalidated")), true)
  assert.equal(isContextError("Extension context invalidated"), true)
  assert.equal(isContextError(new Error("Could not establish connection. Receiving end does not exist.")), false)
  assert.equal(isContextError(new Error("send failed")), false)
})
