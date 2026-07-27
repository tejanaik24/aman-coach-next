function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false

  // Postgres errors surfaced with a 5-char SQLSTATE code (e.g. "23505" unique_violation)
  // are data/constraint errors, not transient — never retry those.
  const code = (err as { code?: unknown }).code
  if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return false

  const message = err.message.toLowerCase()
  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("etimedout") ||
    message.includes("aborted")
  )
}

export async function withRetry<T>(fn: () => PromiseLike<T>, retries = 2, delayMs = 500): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === retries || !isTransientError(err)) throw err
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw lastError
}
