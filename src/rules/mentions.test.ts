import assert from "node:assert/strict"
import test from "node:test"
import { extraMentions, mentionsInText, stripMentions } from "./mentions.ts"

test("extra mentions ignore self, op, and reply parent", () => {
  const extra = extraMentions({
    mentions: ["parent", "spam_01", "op"],
    replyTo: ["parent"],
    selfHandle: "me",
    rootHandle: "op",
  })
  assert.deepEqual(extra, ["spam_01"])
})

test("strip mentions leaves the Chinese template", () => {
  assert.equal(stripMentions("@alice 这个真的值得你过来看看详情"), "这个真的值得你过来看看详情")
  assert.deepEqual(mentionsInText("@alice 这个 @bob"), ["alice", "bob"])
})
