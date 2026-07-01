// This page is never reached.
// - Unauthenticated users: beforeFiles rewrite in next.config.ts serves /index.html
// - Authenticated users: proxy.ts redirects to /coach/dashboard or /home
export default function RootPage() {
  return null
}
