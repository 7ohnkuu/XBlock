import assert from "node:assert/strict"
import test from "node:test"
import { isBindCandidateId, isStatusPath, parseConversationId, profilePath, unresolvedKey } from "./path.ts"

test("status paths", () => {
  assert.equal(isStatusPath("/foo/status/123"), true)
  assert.equal(isStatusPath("/i/status/123"), true)
  assert.equal(isStatusPath("/foo/status/123/photo/1"), true)
  assert.equal(isStatusPath("/home"), false)
  assert.equal(isStatusPath("/notifications"), false)
  assert.equal(isStatusPath("/search"), false)
  assert.equal(isStatusPath("/i/timeline"), false)
  assert.equal(isStatusPath("/messages"), false)
  assert.equal(isStatusPath("/foo"), false)
})

test("conversation id", () => {
  assert.equal(parseConversationId("/a/status/99/photo/1"), "99")
  assert.equal(parseConversationId("/home"), null)
})

test("profile path", () => {
  assert.equal(profilePath("@alice_01"), "/alice_01")
  assert.equal(profilePath("alice_01"), "/alice_01")
})

test("bind candidate keys", () => {
  assert.equal(unresolvedKey("@Alice"), "unresolved:alice")
  assert.equal(isBindCandidateId("unresolved:alice"), true)
  assert.equal(isBindCandidateId("h:alice"), true)
  assert.equal(isBindCandidateId("12345"), false)
})
