import assert from "node:assert/strict"
import test from "node:test"
import { normalizeText } from "../rules/normalize.ts"
import { migrate, SEED_REVISION } from "./schema.ts"

test("migrate merges new seed revision into existing wordlists", () => {
  const old = {
    schemaVersion: 1,
    settings: { enableDrain: true, enableScamAdult: true, enableCrossTweet: true, enableSlowExpand: true },
    wordlists: {
      drain: [{ raw: "微信", normalized: normalizeText("微信"), addedAt: 1, source: "seed" as const }],
      scamAdult: [],
      custom: [],
      domains: [],
    },
  }
  const next = migrate(old)
  assert.equal(next.settings.seedRevision, SEED_REVISION)
  assert.ok(next.wordlists.drain.some((w) => w.normalized === normalizeText("点主页")))
  assert.ok(next.wordlists.scamAdult.some((w) => w.normalized === normalizeText("找炮友")))
  assert.ok(next.wordlists.scamAdult.some((w) => w.normalized === normalizeText("选妃")))
})
