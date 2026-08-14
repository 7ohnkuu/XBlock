import assert from "node:assert/strict"
import test from "node:test"
import { isDigitFarmHandle } from "./handles.ts"

test("latin letters plus 5+ trailing digits is a farm handle", () => {
  assert.equal(isDigitFarmHandle("Namexx42567"), true)
  assert.equal(isDigitFarmHandle("Alice000111"), true)
  assert.equal(isDigitFarmHandle("user1234"), false)
  assert.equal(isDigitFarmHandle("FirstnameLastn"), false)
})
