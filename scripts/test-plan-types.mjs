import { schemeText, cardioBpm, calcAge } from "../src/lib/plan/types.ts"

console.log("--- Testing cardioBpm ---")
const bpmCase1 = cardioBpm(34, 60, "Z2")
console.log("Age 34, rest 60, Z2:", bpmCase1)
if (bpmCase1 !== "136-148 bpm") {
  console.error("FAIL: Expected 136-148 bpm, got", bpmCase1)
  process.exit(1)
} else {
  console.log("PASS: cardioBpm(34, 60, 'Z2') is 136-148 bpm")
}

const bpmCase2 = cardioBpm(null, 60, "Z2")
console.log("No age fallback:", bpmCase2)
if (bpmCase2 !== "Average BPM 110-130") {
  console.error("FAIL: Expected Average BPM 110-130")
  process.exit(1)
}

const bpmCase3 = cardioBpm(40, 70, "Z3")
console.log("Age 40, rest 70, Z3:", bpmCase3)

console.log("\n--- Testing calcAge ---")
const age1 = calcAge("15/04/1990")
console.log("DOB 15/04/1990 -> age:", age1)

console.log("\n--- Testing schemeText ---")
const st1 = schemeText({ warmupSets: 2, workingSets: 3, reps: { min: 10, max: 15 } })
console.log("2 warm up + 3 x 10-15:", st1)
if (st1 !== "2 warm up + 3 × 10-15 Reps") {
  console.error("FAIL: Expected '2 warm up + 3 × 10-15 Reps', got", st1)
  process.exit(1)
} else {
  console.log("PASS: schemeText matches '2 warm up + 3 × 10-15 Reps'")
}

const st2 = schemeText({ warmupSets: 1, workingSets: 4, reps: "8-12", side: true })
console.log("1 warm up + 4 x 8-12 each side:", st2)

const st3 = schemeText({ kind: "cardio", cardioMachine: "Incline walk", cardioMinutes: 15, cardioZone: "Z2" })
console.log("Cardio scheme:", st3)

const st4 = schemeText({ kind: "stretch", stretchType: "static", workingSets: 2, stretchHoldSec: 30 })
console.log("Static stretch:", st4)

const st5 = schemeText({ custom: true, customSets: "Aman special 5x5" })
console.log("Custom sets:", st5)
if (st5 !== "Aman special 5x5") {
  console.error("FAIL: custom text not preserved")
  process.exit(1)
}

console.log("\nALL TESTS PASSED!")
