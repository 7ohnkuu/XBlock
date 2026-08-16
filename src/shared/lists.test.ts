import assert from "node:assert/strict"
import test from "node:test"
import { defaultState } from "./schema.ts"
import { applyPending, lookupList, rebindHandle } from "./lists.ts"
import { unresolvedKey } from "./path.ts"

test("bind-candidate pending does not D2 hide by handle", () => {
  const lists = defaultState().lists
  const key = unresolvedKey("onlyhandle")
  lists.pendingBlock[key] = {
    userId: key,
    handle: "onlyhandle",
    reasons: ["manual"],
    sourceConversationId: "old",
    addedAt: 1,
    updatedAt: 1,
    unresolved: true,
  }
  assert.equal(lookupList(lists, key, "onlyhandle"), null)
  assert.equal(lookupList(lists, "h:onlyhandle", "onlyhandle"), null)
})

test("bound pending hides by rest_id and by handle", () => {
  const lists = defaultState().lists
  lists.pendingBlock["42"] = {
    userId: "42",
    handle: "real",
    reasons: ["drain"],
    sourceConversationId: "old",
    addedAt: 1,
    updatedAt: 1,
  }
  assert.equal(lookupList(lists, "42", "real"), "pending")
  assert.equal(lookupList(lists, unresolvedKey("real"), "real"), "pending")
})

test("rebind moves unresolved and legacy h: onto rest_id", () => {
  let lists = defaultState().lists
  lists = applyPending(lists, {
    userId: unresolvedKey("alice"),
    handle: "alice",
    reasons: ["manual"],
    sourceConversationId: "c",
  })
  lists.pendingBlock[unresolvedKey("alice")].unresolved = true
  lists.pendingBlock["h:bob"] = {
    userId: "h:bob",
    handle: "bob",
    reasons: ["manual"],
    sourceConversationId: "c",
    addedAt: 1,
    updatedAt: 1,
    unresolved: true,
  }
  const alice = rebindHandle(lists, "alice", "99", "Alice")
  assert.equal(alice.pendingBlock["99"]?.handle, "alice")
  assert.equal(alice.pendingBlock[unresolvedKey("alice")], undefined)
  const bob = rebindHandle(alice, "bob", "100")
  assert.equal(bob.pendingBlock["100"]?.handle, "bob")
  assert.equal(bob.pendingBlock["h:bob"], undefined)
})

test("exempt wins lookup over pending", () => {
  const lists = defaultState().lists
  lists.pendingBlock["1"] = {
    userId: "1",
    handle: "a",
    reasons: ["drain"],
    sourceConversationId: "c",
    addedAt: 1,
    updatedAt: 1,
  }
  lists.exempt["1"] = { userId: "1", handle: "a", updatedAt: 2 }
  assert.equal(lookupList(lists, "1", "a"), "exempt")
})
