import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SESSION_STORAGE_KEY = '_pb_sess'

/**
 * Move the existing browser session to the generic storage key before the
 * client is initialized, so the footprint change does not sign users out.
 */
function migrateLegacySessionStorage(supabaseUrl: string) {
  if (typeof window === 'undefined') return

  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    if (!projectRef) return

    const legacyKey = `sb-${projectRef}-auth-token`
    const legacySession = window.localStorage.getItem(legacyKey)
    if (legacySession === null) return

    if (window.localStorage.getItem(SESSION_STORAGE_KEY) === null) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, legacySession)
    }

    window.localStorage.removeItem(legacyKey)
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  migrateLegacySessionStorage(supabaseUrl)

  return createSupabaseClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: SESSION_STORAGE_KEY,
        flowType: 'implicit',
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
      }
    }
  )
}
