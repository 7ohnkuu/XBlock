import assert from "node:assert/strict"
import test from "node:test"
import { mentionsInText } from "../rules/mentions.ts"
import { defaultState } from "../shared/schema.ts"
import { unresolvedKey } from "../shared/path.ts"
import type { CommentRecord } from "../shared/types.ts"
import { stepPageSession } from "./pageSession.ts"

function c(partial: Partial<CommentRecord> & { tweetId: string; handle: string; text: string }): CommentRecord {
  return {
    userId: partial.userId ?? `id:${partial.handle}`,
    displayName: partial.displayName ?? partial.handle,
    urls: partial.urls ?? [],
    mentions: partial.mentions ?? mentionsInText(partial.text),
    replyTo: partial.replyTo ?? [],
    isRoot: partial.isRoot ?? false,
    isRootAuthor: partial.isRootAuthor ?? false,
    ...partial,
  }
}

test("rebind emits one lists mutation and binds pending", () => {
  const state = defaultState()
  const key = unresolvedKey("alice")
  state.lists.pendingBlock[key] = {
    userId: key,
    handle: "alice",
    reasons: ["manual"],
    sourceConversationId: "old",
    addedAt: 1,
    updatedAt: 1,
    unresolved: true,
  }
  const step = stepPageSession({
    conversationId: "1",
    comments: [
      c({ tweetId: "1", handle: "op", text: "root", isRoot: true, isRootAuthor: true, userId: "op" }),
      c({ tweetId: "2", handle: "alice", text: "你好", userId: "99" }),
    ],
    state,
    previousSuggestions: [],
  })
  assert.equal(step.mutations.some((m) => m.op === "rebind" && m.userId === "99"), true)
  assert.equal(step.state.lists.pendingBlock["99"]?.handle, "alice")
  assert.equal(step.byTweetId["2"].hide, true)
})

test("checkbox memory is applied here, not in classify", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "bot", text: "@alice 这个角度很有意思啊朋友", userId: "b1" }),
  ]
  const first = stepPageSession({
    conversationId: "1",
    comments,
    state: defaultState(),
    previousSuggestions: [],
  })
  assert.equal(first.suggestions[0]?.checked, true)
  const second = stepPageSession({
    conversationId: "1",
    comments,
    state: defaultState(),
    previousSuggestions: first.suggestions.map((s) => ({ ...s, checked: false })),
  })
  assert.equal(second.suggestions[0]?.checked, false)
})
