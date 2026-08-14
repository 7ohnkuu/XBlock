import assert from "node:assert/strict"
import test from "node:test"
import { applyImport, parseImport, serializeExport } from "./io.ts"
import { defaultState } from "./schema.ts"

test("round-trip wordlist", () => {
  const state = defaultState()
  const json = serializeExport("xblock-wordlist", state)
  const parsed = parseImport(json, "xblock-wordlist.json")
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  const merged = applyImport(state, parsed, "merge")
  assert.ok(merged.wordlists.drain.length >= state.wordlists.drain.length)
})

test("txt import prefixes", () => {
  const parsed = parseImport("drain: 加我QQ\nscam: 色情网\njust-custom\n", "words.txt")
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.deepEqual(parsed.wordlists?.drain, ["加我QQ"])
  assert.deepEqual(parsed.wordlists?.scamAdult, ["色情网"])
  assert.deepEqual(parsed.wordlists?.custom, ["just-custom"])
})

test("bad json rejected wholly", () => {
  const parsed = parseImport("{not json", "x.json")
  assert.equal(parsed.ok, false)
})

test("unknown kind rejected", () => {
  const parsed = parseImport(JSON.stringify({ kind: "nope", schemaVersion: 1 }), "x.json")
  assert.equal(parsed.ok, false)
})

test("lists import pending is D2-ready; handle-only is unresolved", () => {
  const parsed = parseImport(
    JSON.stringify({
      kind: "xblock-lists",
      schemaVersion: 1,
      lists: {
        pendingBlock: [{ handle: "onlyhandle" }, { userId: "42", handle: "real" }],
        blockedMirror: [],
        exempt: [],
      },
    }),
    "l.json",
  )
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  const state = applyImport(defaultState(), parsed, "merge")
  assert.ok(state.lists.pendingBlock["42"])
  assert.ok(state.lists.pendingBlock["unresolved:onlyhandle"]?.unresolved)
})

test("exempt wins on merge", () => {
  const parsed = parseImport(
    JSON.stringify({
      kind: "xblock-lists",
      schemaVersion: 1,
      lists: {
        pendingBlock: [{ userId: "1", handle: "a" }],
        exempt: [{ userId: "1", handle: "a" }],
        blockedMirror: [],
      },
    }),
    "l.json",
  )
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  const state = applyImport(defaultState(), parsed, "merge")
  assert.ok(state.lists.exempt["1"])
  assert.equal(state.lists.pendingBlock["1"], undefined)
})

test("unknown prefix in txt fails the whole file", () => {
  const parsed = parseImport("foo: bar\n", "w.txt")
  assert.equal(parsed.ok, false)
})
