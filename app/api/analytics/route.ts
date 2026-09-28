import { after } from 'next/server'
import { NextResponse } from 'next/server'
import { canonicalCommerceEventSchema, recordCanonicalEvent } from '@/lib/analytics/events'
import { dispatchAnalyticsEvent } from '@/lib/analytics/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_EVENT_BYTES = 48 * 1024

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get('content-length') || 0)
    if (declaredLength > MAX_EVENT_BYTES) {
      return NextResponse.json({ ok: false, message: 'Analytics event is too large.' }, { status: 413, headers: { 'Cache-Control': 'no-store' } })
    }

    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_EVENT_BYTES) {
      return NextResponse.json({ ok: false, message: 'Analytics event is too large.' }, { status: 413, headers: { 'Cache-Control': 'no-store' } })
    }

    const parsed = canonicalCommerceEventSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Invalid analytics event.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }

    const event = parsed.data
    const persisted = await recordCanonicalEvent(event)
    if (!persisted.ok) return NextResponse.json({ ok: true, accepted: false }, { headers: { 'Cache-Control': 'no-store' } })

    after(() => dispatchAnalyticsEvent(event).catch((error) => {
      console.error(JSON.stringify({ level: 'error', msg: 'analytics_dispatch_failed', eventName: event.eventName, error: error instanceof Error ? error.message : String(error) }))
    }))

    return NextResponse.json(
      { ok: true, accepted: true, duplicate: persisted.duplicate, delivery: 'queued' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ ok: true, accepted: false }, { headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'analytics', version: '1.1' }, { headers: { 'Cache-Control': 'no-store' } })
}
