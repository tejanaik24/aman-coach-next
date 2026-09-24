import { logger, schedules, task } from "@trigger.dev/sdk"

export type AutomationEvent = { deliveryId: string; eventType: string; payload: Record<string, unknown> }

function appUrl() {
  const value = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!value) throw new Error("APP_URL is required in Trigger.dev")
  return value.replace(/\/$/, "")
}

async function deliver(event: AutomationEvent) {
  const response = await fetch(`${appUrl()}/api/automation/deliver-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-automation-secret": process.env.AUTOMATION_SECRET || "" },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`Automation delivery failed with ${response.status}: ${await response.text()}`)
}

export const deliverAutomationEvent = task({
  id: "deliver-automation-event",
  retry: { maxAttempts: 8, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 30_000, randomize: true },
  queue: { name: "client-communications", concurrencyLimit: 4 },
  run: async (event: AutomationEvent) => { await deliver(event); logger.info("Automation delivery completed", { deliveryId: event.deliveryId, eventType: event.eventType }) },
})

export const retryPendingAutomationEvents = schedules.task({
  id: "retry-pending-automation-events",
  cron: { pattern: "*/5 * * * *", timezone: "Asia/Kolkata", environments: ["PRODUCTION"] },
  run: async () => {
    const response = await fetch(`${appUrl()}/api/cron/retry-webhooks`, { method: "POST", headers: { "x-automation-secret": process.env.AUTOMATION_SECRET || "" }, signal: AbortSignal.timeout(20_000) })
    if (!response.ok) throw new Error(`Automation retry sweep failed with ${response.status}: ${await response.text()}`)
  },
})
