import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SESSION_STORAGE_KEY = '_pb_sess'

/**
 * Migrate old Supabase-named browser session keys without embedding the
 * project's Supabase URL or project reference in the browser bundle.
 */
function migrateLegacySessionStorage() {
  if (typeof window === 'undefined') return

  try {
    const storage = window.localStorage
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => Boolean(key))

    const hasNewSession = keys.some(
      (key) => key === SESSION_STORAGE_KEY || key.startsWith(`${SESSION_STORAGE_KEY}.`)
    )
    if (hasNewSession) return

    const legacyBaseKeys = new Set(
      keys
        .filter((key) => /^sb-.+-auth-token(?:\.\d+)?$/.test(key))
        .map((key) => key.replace(/\.\d+$/, ''))
    )
    // Never guess when multiple Supabase projects have sessions in this origin.
    if (legacyBaseKeys.size !== 1) return

    const legacyBaseKey = Array.from(legacyBaseKeys)[0]
    const legacyKeys = keys.filter(
      (key) => key === legacyBaseKey || key.startsWith(`${legacyBaseKey}.`)
    )

    for (const key of legacyKeys) {
      const suffix = key.slice(legacyBaseKey.length)
      const value = storage.getItem(key)
      if (value !== null) storage.setItem(`${SESSION_STORAGE_KEY}${suffix}`, value)
    }

    legacyKeys.forEach((key) => storage.removeItem(key))
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function getBrowserSupabaseUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3000/_gateway'
  return new URL('/_gateway', window.location.origin).toString()
}

export function createClient() {
  migrateLegacySessionStorage()

  return createSupabaseClient(
    getBrowserSupabaseUrl(),
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
