import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

/**
 * Bounds how long we wait on Supabase when the session is refreshing or the network stalls,
 * so page loaders do not spin forever.
 */
export function withSupabaseTimeout(promise, ms = 45000) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Request timed out. Check your connection and try again.')),
      ms
    )
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

/**
 * Returns the current session or throws if auth is missing/expired (after timeout).
 * Use before protected mutations so failures surface clearly.
 */
export async function ensureSession(ms = 30000) {
  const {
    data: { session },
    error,
  } = await withSupabaseTimeout(supabase.auth.getSession(), ms)
  if (error) throw error
  if (!session?.user) {
    throw new Error('Your session expired. Please sign in again.')
  }
  return session
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Retry a Supabase (or any) async op with exponential backoff.
 * @param {() => Promise<T>} fn
 * @param {number} [maxRetries=3]
 * @param {number} [baseDelay=1000]
 * @returns {Promise<T>}
 */
export async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastErr
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      if (attempt === maxRetries) break
      const delay = baseDelay * 2 ** attempt
      await sleep(delay)
    }
  }
  throw lastErr
}
