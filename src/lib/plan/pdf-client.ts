import type { PlanDoc } from "./types"

// The PDF is built on the server (Mumbai): on Aman's phone it froze the app ~8 seconds every
// Preview / Send (measured 26 Oct). The phone only downloads the finished file.
// If the server cannot be reached, the old on-phone build still works.
export async function renderPlanPdf(doc: PlanDoc): Promise<Blob> {
  try {
    const res = await fetch("/api/coach/plans/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc }),
    })
    if (res.ok && res.headers.get("content-type")?.includes("application/pdf")) return await res.blob()
  } catch {
    // offline or server error: build on the phone below
  }
  const { renderPlanPdfLocally } = await import("./pdf")
  return renderPlanPdfLocally(doc)
}
