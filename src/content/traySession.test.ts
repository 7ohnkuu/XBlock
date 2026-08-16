import assert from "node:assert/strict"
import test from "node:test"
import type { Suggestion } from "../shared/types.ts"
import { applyTraySession, scoreReasons } from "./traySession.ts"

function sug(partial: Partial<Suggestion> & { userId: string }): Suggestion {
  return {
    handle: partial.handle ?? partial.userId,
    displayName: partial.displayName ?? partial.userId,
    reasons: partial.reasons ?? ["drain"],
    matchedTerms: partial.matchedTerms ?? [],
    score: partial.score ?? 0,
    checked: partial.checked ?? false,
    ...partial,
  }
}

test("farm scores like mention, not like drain", () => {
  assert.equal(scoreReasons(["farm"]), scoreReasons(["mention"]))
  assert.ok(scoreReasons(["drain"]) !== scoreReasons(["farm"]))
})

test("first seen accounts default to checked", () => {
  const next = applyTraySession([sug({ userId: "a" })], [], 15)
  assert.equal(next[0].checked, true)
})

test("rescan keeps the user's uncheck", () => {
  const prev = [sug({ userId: "a", checked: false, reasons: ["mention"] })]
  const next = applyTraySession([sug({ userId: "a", reasons: ["mention"] })], prev, 15)
  assert.equal(next[0].checked, false)
})

test("caps at maxTray after scoring", () => {
  const many = Array.from({ length: 5 }, (_, i) =>
    sug({ userId: `u${i}`, reasons: i === 0 ? ["cross_tweet"] : ["farm"] }),
  )
  const next = applyTraySession(many, [], 2)
  assert.equal(next.length, 2)
  assert.equal(next[0].userId, "u0")
})
