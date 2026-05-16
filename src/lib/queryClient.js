import { QueryClient } from '@tanstack/react-query'

/**
 * Centralised React Query configuration.
 *
 * - `staleTime` / `gcTime` keep memory pressure bounded but let cached pages
 *   render instantly when the user navigates back.
 * - Realtime channels already invalidate hot queries, so we *don't* refetch
 *   on every window focus aggressively — `refetchOnWindowFocus: true` only
 *   refetches when the data is already stale (per `staleTime`), so heavy
 *   queries don't restart on every tab switch.
 * - `refetchOnReconnect: 'always'` makes sure that after a network drop we
 *   resync immediately (we may have missed realtime events while offline).
 * - `retry` skips retrying obvious auth errors so the UI doesn't stall for
 *   3+ seconds when the session is just expired.
 */
function shouldRetry(failureCount, error) {
  const status = error?.status ?? error?.statusCode ?? error?.code
  if (status === 401 || status === 403 || status === '401' || status === '403') {
    return false
  }
  if (typeof error?.message === 'string' && /timed out/i.test(error.message)) {
    return false
  }
  return failureCount < 1
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 120_000,
      gcTime: 600_000,
      retry: shouldRetry,
      refetchOnWindowFocus: true,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 0,
    },
  },
})
