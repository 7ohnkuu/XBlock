import assert from "node:assert/strict"
import test from "node:test"
import { isDigitFarmHandle } from "./handles.ts"

test("latin letters plus 5+ digits is a weak farm handle", () => {
  assert.equal(isDigitFarmHandle("Namexx42567"), true)
  assert.equal(isDigitFarmHandle("Alice000111"), true)
  assert.equal(isDigitFarmHandle("Alice_42567"), true)
  assert.equal(isDigitFarmHandle("42567Alice"), true)
  assert.equal(isDigitFarmHandle("Alice42567x"), true)
  assert.equal(isDigitFarmHandle("user1234"), false)
  assert.equal(isDigitFarmHandle("FirstnameLastn"), false)
  assert.equal(isDigitFarmHandle("Al42567"), false)
})
