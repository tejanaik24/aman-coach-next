import assert from "node:assert/strict"
import { phoneEmail, loginIdentifierToEmail } from "../src/lib/phone-login.ts"

const DOMAIN = "clients.amankhuranafitness.com"

const cases = [
  { input: "9885382525", expected: `9885382525@${DOMAIN}` },
  { input: "919885382525", expected: `9885382525@${DOMAIN}` },
  { input: "+91 98853 82525", expected: `9885382525@${DOMAIN}` },
  { input: "971501234567", expected: `971501234567@${DOMAIN}` },
  { input: "a@b.com", expected: "a@b.com" },
]

console.log("=== Checking Phone Login Helper ===")
for (const { input, expected } of cases) {
  const loginResult = loginIdentifierToEmail(input)
  console.log(`loginIdentifierToEmail("${input}") -> ${loginResult}`)
  assert.equal(loginResult, expected)

  if (!input.includes("@")) {
    const phoneResult = phoneEmail(input)
    console.log(`phoneEmail("${input}") -> ${phoneResult}`)
    assert.equal(phoneResult, expected)
  }
}

console.log("\nALL ASSERTIONS PASSED ✅")

