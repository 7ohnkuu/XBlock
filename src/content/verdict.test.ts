import assert from "node:assert/strict"
import test from "node:test"
import { decide, emptySignals, type Signals } from "./verdict.ts"

function sig(partial: Partial<Signals>): Signals {
  return { ...emptySignals(), ...partial }
}

test("exempt is ignore even with hide signals", () => {
  const v = decide("exempt", sig({ drainHits: ["微信"], farmHandle: true }))
  assert.equal(v.layer, "ignore")
  assert.deepEqual(v.reasons, [])
})

test("pending is hide + manual", () => {
  const v = decide("pending", sig({}))
  assert.equal(v.layer, "hide")
  assert.ok(v.reasons.includes("manual"))
})

test("drain words hide", () => {
  const v = decide(null, sig({ drainHits: ["微信"] }))
  assert.equal(v.layer, "hide")
  assert.ok(v.reasons.includes("drain"))
})

test("farm alone is suggest, not drain", () => {
  const v = decide(null, sig({ farmHandle: true }))
  assert.equal(v.layer, "suggest")
  assert.ok(v.reasons.includes("farm"))
  assert.ok(!v.reasons.includes("drain"))
  assert.ok(v.matchedTerms.includes("handle_farm"))
})

test("farm plus scam hides and keeps farm", () => {
  const v = decide(null, sig({ farmHandle: true, scamHits: ["约炮"] }))
  assert.equal(v.layer, "hide")
  assert.ok(v.reasons.includes("scam_adult"))
  assert.ok(v.reasons.includes("farm"))
})

test("extra mentions suggest", () => {
  const v = decide(null, sig({ extraMentions: ["alice", "bob"] }))
  assert.equal(v.layer, "suggest")
  assert.ok(v.reasons.includes("mention"))
  assert.ok(!v.reasons.includes("drain"))
})

test("near-dup is hide", () => {
  const v = decide(null, sig({ nearDup: true }))
  assert.equal(v.layer, "hide")
  assert.ok(v.reasons.includes("dup_in_thread"))
})

test("cross-tweet suggests", () => {
  const v = decide(null, sig({ crossTweet: true }))
  assert.equal(v.layer, "suggest")
  assert.ok(v.reasons.includes("cross_tweet"))
})

test("empty signals ignore", () => {
  const v = decide(null, sig({}))
  assert.equal(v.layer, "ignore")
})

test("contact hides as drain", () => {
  const v = decide(null, sig({ contact: true }))
  assert.equal(v.layer, "hide")
  assert.ok(v.reasons.includes("drain"))
  assert.ok(v.matchedTerms.includes("contact"))
})
