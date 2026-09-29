import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { CanonicalCommerceEvent } from './types'
import type { AnalyticsProviderId } from './provider-adapters'
import type { HttpDeliveryResult } from './transport'

export type AnalyticsDeliveryStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED'

export type AnalyticsDeliveryRecord = {
  event_id: string
  provider: AnalyticsProviderId
  status: AnalyticsDeliveryStatus
  attempt_count: number
  event_payload: CanonicalCommerceEvent
  last_attempt_at: string | null
  next_attempt_at: string | null
  latency_ms: number | null
  http_status: number | null
  category: string | null
  response_excerpt: string | null
}

export async function ensureDeliveryLedgerEntry(event: CanonicalCommerceEvent, provider: AnalyticsProviderId) {
  try {
    const db = createAdminClient()
    await db.from('analytics_delivery_ledger').upsert({
      event_id: event.eventId,
      provider,
      status: 'PENDING',
      event_payload: event,
      next_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_id,provider', ignoreDuplicates: true })
  } catch {
    // Analytics observability must never affect commerce.
  }
}

export async function recordDeliveryResult(event: CanonicalCommerceEvent, provider: AnalyticsProviderId, result: HttpDeliveryResult) {
  try {
    const db = createAdminClient()
    const failed = !result.ok
    const nextAttempt = failed ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null
    await db.from('analytics_delivery_ledger').upsert({
      event_id: event.eventId,
      provider,
      status: failed ? 'FAILED' : 'SUCCEEDED',
      attempt_count: result.attempts,
      event_payload: event,
      last_attempt_at: new Date().toISOString(),
      next_attempt_at: nextAttempt,
      latency_ms: result.latency,
      http_status: result.status ?? null,
      category: result.category ?? null,
      response_excerpt: result.responseBody ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_id,provider' })
  } catch {
    // Ledger failures are diagnostic-only and must not fail the event path.
  }
}

export async function listRetryableDeliveries(limit = 20): Promise<AnalyticsDeliveryRecord[]> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('analytics_delivery_ledger')
      .select('event_id,provider,status,attempt_count,event_payload,last_attempt_at,next_attempt_at,latency_ms,http_status,category,response_excerpt')
      .eq('status', 'FAILED')
      .lte('next_attempt_at', new Date().toISOString())
      .order('next_attempt_at', { ascending: true })
      .limit(Math.min(Math.max(limit, 1), 100))
    return (data || []) as AnalyticsDeliveryRecord[]
  } catch {
    return []
  }
}
