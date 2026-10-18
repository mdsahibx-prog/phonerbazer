import 'server-only'

type ProxyTarget = { origin: string; prefix: string }

const LEGACY_SUPABASE_URL =
  process.env.SUPABASE_LEGACY_URL || 'https://ncknpaezdhsqiicdjtgr.supabase.co'

function normalizeOrigin(value: string | undefined) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function getSupabaseProxyTargets(): ProxyTarget[] {
  const primaryOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const legacyOrigin = normalizeOrigin(LEGACY_SUPABASE_URL)
  const targets: ProxyTarget[] = []

  if (primaryOrigin) targets.push({ origin: primaryOrigin, prefix: '/_gateway' })
  if (legacyOrigin && legacyOrigin !== primaryOrigin) {
    targets.push({ origin: legacyOrigin, prefix: '/_media' })
  }

  return targets
}

export function getPublicApplicationOrigin() {
  if (process.env.VERCEL_ENV === 'production') {
    return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) || 'https://www.phonerbazar.store'
  }

  if (process.env.VERCEL_URL) {
    return normalizeOrigin(`https://${process.env.VERCEL_URL}`) || 'https://www.phonerbazar.store'
  }

  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:${process.env.PORT || '3000'}`
  }

  return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) || 'https://www.phonerbazar.store'
}

export function toProxiedSupabaseUrl(value: string | null | undefined): string | null {
  if (!value) return null

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return value
  }

  const target = getSupabaseProxyTargets().find((candidate) => candidate.origin === url.origin)
  if (!target) return value

  return `${target.prefix}${url.pathname}${url.search}${url.hash}`
}

function rewriteSupabaseOriginsToRelative(body: string) {
  let result = body
  for (const target of getSupabaseProxyTargets()) {
    result = result.split(target.origin).join(target.prefix)
  }
  return result
}

function rewriteSupabaseOriginsForBrowser(body: string) {
  const publicOrigin = getPublicApplicationOrigin()
  let result = body
  for (const target of getSupabaseProxyTargets()) {
    result = result.split(target.origin).join(`${publicOrigin}${target.prefix}`)
  }
  // Existing database records and new upload actions can store portable paths.
  // Make those paths absolute only in the server response going to the browser.
  result = result
    .replaceAll('"/_gateway', `"${publicOrigin}/_gateway`)
    .replaceAll('"/_media', `"${publicOrigin}/_media`)
  return result
}

/**
 * Rewrite backend URLs found in JSON payloads before server components or
 * server actions can serialize them into HTML, RSC data, or browser responses.
 * Requests still go to the configured Supabase project from server-side code.
 */
export function createProxyAwareFetch(): typeof fetch {
  return async (input, init) => {
    let requestInit = init
    if (typeof init?.body === 'string') {
      const rewrittenRequestBody = rewriteSupabaseOriginsToRelative(init.body)
      if (rewrittenRequestBody !== init.body) {
        const headers = new Headers(init.headers)
        headers.delete('content-length')
        headers.delete('content-md5')
        requestInit = { ...init, headers, body: rewrittenRequestBody }
      }
    }

    const response = await fetch(input, requestInit)
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('json')) return response

    const originalBody = await response.clone().text()
    const rewrittenBody = rewriteSupabaseOriginsForBrowser(originalBody)
    if (rewrittenBody === originalBody) return response

    const headers = new Headers(response.headers)
    headers.delete('content-length')
    headers.delete('content-encoding')
    headers.delete('transfer-encoding')
    headers.delete('etag')
    headers.delete('content-md5')

    return new Response(rewrittenBody, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}

export function rewriteSupabaseUrlsInValue<T>(value: T): T {
  if (typeof value === 'string') return rewriteSupabaseOriginsToRelative(value) as T
  if (Array.isArray(value)) return value.map((entry) => rewriteSupabaseUrlsInValue(entry)) as T

  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) return value
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, entry]) => [key, rewriteSupabaseUrlsInValue(entry)] as const,
    )
    return Object.fromEntries(entries) as T
  }

  return value
}
