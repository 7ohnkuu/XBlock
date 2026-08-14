import assert from "node:assert/strict"
import test from "node:test"
import { mentionsInText } from "../rules/mentions.ts"
import { defaultState } from "../shared/schema.ts"
import type { CommentRecord } from "../shared/types.ts"
import { classifyThread } from "./classify.ts"

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

test("reply-parent @ only is not mention spam", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root post", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "human", text: "@parent 我同意这个看法", replyTo: ["parent"] }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, false)
  assert.equal(r.byTweetId["2"].suggest, false)
})

test("two extra @mentions in Chinese reply go to tray, not auto-hide", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root post", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "bot", text: "@alice @bob 来看看这个有意思" }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, false)
  assert.equal(r.byTweetId["2"].suggest, true)
  assert.ok(r.byTweetId["2"].reasons.includes("mention"))
})

test("same Chinese template with different @accounts is not near-dup without a spam gate", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root post", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "bot1", text: "@alice 这个真的值得你过来看看详情" }),
    c({ tweetId: "3", handle: "bot2", text: "@carol 这个真的值得你过来看看详情" }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, false)
  assert.equal(r.byTweetId["3"].hide, false)
  assert.ok(r.suggestions.some((s) => s.handle === "bot1"))
})

test("same template plus url gate is near-dup after stripping @", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root post", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({
      tweetId: "2",
      handle: "bot1",
      text: "@alice 详情请看这里领取资料谢谢",
      urls: ["https://spam.example/a"],
    }),
    c({
      tweetId: "3",
      handle: "bot2",
      text: "@carol 详情请看这里领取资料谢谢",
      urls: ["https://spam.example/a"],
    }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, true)
  assert.equal(r.byTweetId["3"].hide, true)
  assert.ok(r.byTweetId["2"].reasons.includes("dup_in_thread"))
})

test("single extra @ in Chinese goes to tray, not auto-hide", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root post", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "bot", text: "@outsider 这个角度很有意思啊朋友" }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, false)
  assert.equal(r.byTweetId["2"].suggest, true)
  assert.ok(r.suggestions.some((s) => s.handle === "bot"))
})

test("English extra @ is ignored by mention rule", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root post", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "en", text: "@bob you should see this thread" }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, false)
  assert.equal(r.byTweetId["2"].suggest, false)
})

test("escort phrases in display name hide even when body is only a reply-parent mention", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root post", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({
      tweetId: "2",
      handle: "Alice000111",
      displayName: "小兰 同城上门 线下选妃",
      text: "@op 应该没人比我玩的开了吧",
      replyTo: ["op"],
    }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, true)
  assert.ok(r.byTweetId["2"].reasons.includes("scam_adult"))
})

test("破处 in display name hides even when handle has no digits", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root post", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({
      tweetId: "2",
      handle: "FirstnameLastn",
      displayName: "阿元 免费破处",
      text: "@op 应该没人比我玩的开吧我福不黑不信你看",
      replyTo: ["op"],
    }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, true)
  assert.ok(r.byTweetId["2"].reasons.includes("scam_adult"))
})

test("farm bait template in body hides without a farm handle", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root post", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({
      tweetId: "2",
      handle: "someone_else",
      displayName: "路人甲",
      text: "@op 应该没人比我玩的开吧我福不黑不信你看",
      replyTo: ["op"],
    }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, true)
})

test("farm handle plus clean CJK name is tray-only without a second spam signal", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root post", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({
      tweetId: "2",
      handle: "Alice_42567",
      displayName: "映月",
      text: "@op 今天天气不错啊朋友",
      replyTo: ["op"],
    }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, false)
  assert.equal(r.byTweetId["2"].suggest, true)
  assert.ok(r.byTweetId["2"].matchedTerms.includes("handle_farm"))
})

test("farm handle plus bait seed still hides", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root post", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({
      tweetId: "2",
      handle: "Alice42567",
      displayName: "映月",
      text: "@op 比我好看的没我骚比我骚的没我好看",
      replyTo: ["op"],
    }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, true)
  assert.ok(r.byTweetId["2"].reasons.includes("scam_adult"))
})

test("cross-tweet fingerprint matches after stripping different @handles", () => {
  const first = classifyThread(
    "aaa",
    [
      c({ tweetId: "1", handle: "op", text: "root", isRoot: true, isRootAuthor: true, userId: "op" }),
      c({
        tweetId: "2",
        handle: "bot1",
        text: "@alice 详情请看这里领取资料谢谢",
        urls: ["https://spam.example/a"],
      }),
    ],
    defaultState(),
  )
  const state = defaultState()
  state.stats.fingerprints = first.statUpdates.fingerprints
  const second = classifyThread(
    "bbb",
    [
      c({ tweetId: "9", handle: "op", text: "root", isRoot: true, isRootAuthor: true, userId: "op" }),
      c({
        tweetId: "8",
        handle: "bot2",
        text: "@carol 详情请看这里领取资料谢谢",
        urls: ["https://spam.example/b"],
      }),
    ],
    state,
  )
  assert.ok(second.byTweetId["8"].reasons.includes("cross_tweet") || second.byTweetId["8"].suggest)
})

test("display name is matched, not only comment body", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root post", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({
      tweetId: "2",
      handle: "adbot",
      displayName: "user 找炮友 点主页",
      text: "hello there",
    }),
    c({
      tweetId: "3",
      handle: "nameonly",
      displayName: "点主页",
      text: "nice weather",
    }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, true)
  assert.equal(r.byTweetId["3"].hide, true)
  assert.ok(r.suggestions.some((s) => s.handle === "nameonly"))
})

test("微信 hits drain hide; 確實 does not", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "大家好", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "spam", text: "加微信 abcde123 详谈" }),
    c({ tweetId: "3", handle: "human", text: "確實" }),
    c({ tweetId: "4", handle: "human2", text: "確實" }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, true)
  assert.ok(r.byTweetId["2"].reasons.includes("drain"))
  assert.equal(r.byTweetId["3"].hide, false)
  assert.equal(r.byTweetId["4"].hide, false)
})

test("traditional 電報 matches simplified seed", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "bot", text: "加我電報群有內幕" }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, true)
})

test("same account all replies hidden", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "spam", text: "加微信 xxx111", userId: "u1" }),
    c({ tweetId: "3", handle: "spam", text: "你好呀", userId: "u1" }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, true)
  assert.equal(r.byTweetId["3"].hide, true)
})

test("near-dup without gate stays visible", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "a", text: "這件事情確實值得認真討論一下啊" }),
    c({ tweetId: "3", handle: "b", text: "這件事情確實值得認真討論一下啊" }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, false)
  assert.equal(r.byTweetId["3"].hide, false)
})

test("near-dup with url gate hides", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({
      tweetId: "2",
      handle: "a",
      text: "详情请看这里领取资料谢谢",
      urls: ["https://spam.example/path"],
    }),
    c({
      tweetId: "3",
      handle: "b",
      text: "详情请看这里领取资料谢谢",
      urls: ["https://spam.example/path"],
    }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["2"].hide, true)
  assert.ok(r.byTweetId["2"].reasons.includes("dup_in_thread"))
})

test("D2 pending hides even 你好", () => {
  const state = defaultState()
  state.lists.pendingBlock["u9"] = {
    userId: "u9",
    handle: "bot9",
    reasons: ["drain"],
    sourceConversationId: "old",
    addedAt: 1,
    updatedAt: 1,
  }
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "bot9", text: "你好", userId: "u9" }),
  ]
  const r = classifyThread("99", comments, state)
  assert.equal(r.byTweetId["2"].hide, true)
  assert.ok(r.pendingSeen.some((p) => p.userId === "u9"))
})

test("exempt wins over pending", () => {
  const state = defaultState()
  state.lists.pendingBlock["u9"] = {
    userId: "u9",
    handle: "bot9",
    reasons: ["drain"],
    sourceConversationId: "old",
    addedAt: 1,
    updatedAt: 1,
  }
  state.lists.exempt["u9"] = { userId: "u9", handle: "bot9", updatedAt: 2 }
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "bot9", text: "加微信 abc", userId: "u9" }),
  ]
  const r = classifyThread("1", comments, state)
  assert.equal(r.byTweetId["2"].hide, false)
})

test("root author never hidden", () => {
  const comments = [
    c({ tweetId: "1", handle: "op", text: "加微信看这个", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "op", text: "加微信再讲", isRootAuthor: true, userId: "op" }),
  ]
  const r = classifyThread("1", comments, defaultState())
  assert.equal(r.byTweetId["1"].hide, false)
  assert.equal(r.byTweetId["2"].hide, false)
})

test("disable drain stops 微信 hide", () => {
  const state = defaultState()
  state.settings.enableDrain = false
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "spam", text: "加微信 abcde123" }),
  ]
  const r = classifyThread("1", comments, state)
  assert.equal(r.byTweetId["2"].hide, false)
})

test("cross-tweet only suggests", () => {
  const state = defaultState()
  state.stats.userHits["cx"] = {
    handle: "repeater",
    conversationIds: ["other"],
    reasons: ["drain"],
    lastSeen: Date.now(),
  }
  const comments = [
    c({ tweetId: "1", handle: "op", text: "root", isRoot: true, isRootAuthor: true, userId: "op" }),
    c({ tweetId: "2", handle: "repeater", text: "今天天气不错啊朋友们", userId: "cx" }),
  ]
  const r = classifyThread("here", comments, state)
  assert.equal(r.byTweetId["2"].hide, false)
  assert.equal(r.byTweetId["2"].suggest, true)
  assert.ok(r.suggestions.some((s) => s.userId === "cx"))
})
