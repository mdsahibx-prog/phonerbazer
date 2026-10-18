import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createProxyAwareFetch } from '@/lib/supabase/proxy'

const SESSION_COOKIE_NAME = '_pb_sess'

function getLegacyAuthCookieName() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const projectRef = supabaseUrl?.match(/^https?:\/\/([^.]+)/)?.[1]
  return projectRef ? `sb-${projectRef}-auth-token` : null
}

export async function createClient() {
  const cookieStore = await cookies()
  const legacyCookieName = getLegacyAuthCookieName()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: createProxyAwareFetch() },
      cookieOptions: { name: SESSION_COOKIE_NAME },
      cookies: {
        getAll() {
          const currentCookies = cookieStore.getAll()
          if (!legacyCookieName) return currentCookies

          const hasGenericSession = currentCookies.some(
            ({ name }) =>
              name === SESSION_COOKIE_NAME ||
              name.startsWith(`${SESSION_COOKIE_NAME}.`)
          )
          if (hasGenericSession) return currentCookies

          // Read the old Supabase cookie names during rollout; Supabase SSR
          // will write the session back under the new generic name.
          const legacyCookies = currentCookies.filter(
            ({ name }) =>
              name === legacyCookieName ||
              name.startsWith(`${legacyCookieName}.`)
          )

          if (legacyCookies.length === 0) return currentCookies

          return [
            ...currentCookies,
            ...legacyCookies.map(({ name, value }) => ({
              name: `${SESSION_COOKIE_NAME}${name.slice(legacyCookieName.length)}`,
              value,
            })),
          ]
        },
        setAll(cookiesToSet) {
          let cookiesWritten = false
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
            cookiesWritten = true
          } catch {
            // Server Components may not be allowed to write response cookies.
          }

          const writesGenericSession = cookiesToSet.some(
            ({ name }) =>
              name === SESSION_COOKIE_NAME ||
              name.startsWith(`${SESSION_COOKIE_NAME}.`)
          )
          if (!cookiesWritten || !writesGenericSession || !legacyCookieName) return

          // Clear the legacy names only after the generic session was written.
          const legacyNames = cookieStore.getAll()
            .filter(
              ({ name }) =>
                name === legacyCookieName ||
                name.startsWith(`${legacyCookieName}.`)
            )
            .map(({ name }) => name)

          legacyNames.forEach((name) => {
            try {
              cookieStore.set(name, '', { path: '/', maxAge: 0 })
            } catch {
              // Cookie cleanup can be unavailable in a Server Component.
            }
          })
        },
      },
    }
  )
}
