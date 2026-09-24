import { defineConfig } from "@trigger.dev/sdk"

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || "trigger-project-ref-required",
  dirs: ["./src/trigger"],
  maxDuration: 300,
  retries: { enabledInDev: false, default: { maxAttempts: 8, minTimeoutInMs: 1_000, maxTimeoutInMs: 30_000, factor: 2, randomize: true } },
})
