import 'server-only'

import { getAnalyticsConfig } from './server'
import { ANALYTICS_PROVIDER_ADAPTERS, type AnalyticsProviderId } from './provider-adapters'
import { ANALYTICS_EVENT_MAP } from './registry'
import {
  ANALYTICS_MAX_DELIVERY_ATTEMPTS,
  claimAnalyticsDeliveryBatch,
  finalizeAnalyticsDelivery,
  releaseDeliveryForProviderRecheck,
} from './delivery-ledger'
import type { HttpDeliveryResult } from './transport'
import type { CanonicalCommerceEvent } from './types'

const DEFAULT_BATCH_SIZE = 25
const DELIVERY_CONCURRENCY = 6

function failureFromError(error: unknown): HttpDeliveryResult {
  return {
    ok: false,
    latency: 0,
    attempts: 0,
    category: 'NETWORK_ERROR',
    responseBody: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
  }
}

function shouldPermanentlySkip(
  event: CanonicalCommerceEvent,
  provider: AnalyticsProviderId,
  config: Awaited<ReturnType<typeof getAnalyticsConfig>>,
) {
  const definition = ANALYTICS_EVENT_MAP[event.eventName]
  if (!definition || !definition.providers.includes(provider)) return true
  if (event.testMode === true) return true
  if (!(event.consent.analytics || event.consent.marketing)) return true
  if (!definition.required && config.eventControls[event.eventName] === false) return true
  return false
}

async function processEntry(
  entry: Awaited<ReturnType<typeof claimAnalyticsDeliveryBatch>>[number],
  config: Awaited<ReturnType<typeof getAnalyticsConfig>>,
) {
  const provider = entry.provider
  const event = entry.event_payload
  const adapter = ANALYTICS_PROVIDER_ADAPTERS[provider]

  if (!adapter || shouldPermanentlySkip(event, provider, config)) {
    const result = await finalizeAnalyticsDelivery(
      event,
      provider,
      { ok: false, latency: 0, attempts: 0, category: 'HTTP_ERROR', responseBody: 'Delivery is not eligible for live replay.' },
      entry.lease_token || null,
      true,
    )
    return { eventId: entry.event_id, provider, ok: result, skipped: true, dead: true, reason: 'NOT_ELIGIBLE' as const }
  }

  if (!config.enabled || (config.environment === 'development' && !config.debugMode)) {
    const released = await releaseDeliveryForProviderRecheck(entry.event_id, provider, entry.lease_token || '')
    return { eventId: entry.event_id, provider, ok: released, skipped: true, dead: false, reason: 'ANALYTICS_DISABLED' as const }
  }

  if (!adapter.canDispatch(event, config)) {
    const released = await releaseDeliveryForProviderRecheck(entry.event_id, provider, entry.lease_token || '')
    return { eventId: entry.event_id, provider, ok: released, skipped: true, dead: false, reason: 'PROVIDER_NOT_READY' as const }
  }

  try {
    const delivery = await adapter.dispatch(event, config)
    const finalized = await finalizeAnalyticsDelivery(event, provider, delivery, entry.lease_token || null)
    return {
      eventId: entry.event_id,
      provider,
      ok: delivery.ok && finalized,
      skipped: false,
      dead: false,
      category: delivery.category,
      attemptNumber: entry.attempt_count + 1,
    }
  } catch (error) {
    const delivery = failureFromError(error)
    const finalized = await finalizeAnalyticsDelivery(event, provider, delivery, entry.lease_token || null)
    return {
      eventId: entry.event_id,
      provider,
      ok: finalized && delivery.ok,
      skipped: false,
      dead: false,
      category: delivery.category,
      attemptNumber: entry.attempt_count + 1,
    }
  }
}

async function finalizeAnalyticsDelivery(
  event: CanonicalCommerceEvent,
  provider: AnalyticsProviderId,
  result: HttpDeliveryResult,
  leaseToken: string | null,
  permanentFailure = false,
) {
  return (await finalizeAnalyticsDeliveryRaw(event, provider, result, leaseToken, permanentFailure)) === true
}

async function finalizeAnalyticsDeliveryRaw(
  event: CanonicalCommerceEvent,
  provider: AnalyticsProviderId,
  result: HttpDeliveryResult,
  leaseToken: string | null,
  permanentFailure = false,
) {
  return finalizeAnalyticsDeliveryImported(event, provider, result, leaseToken, permanentFailure)
}

async function finalizeAnalyticsDeliveryImported(
  event: CanonicalCommerceEvent,
  provider: AnalyticsProviderId,
  result: HttpDeliveryResult,
  leaseToken: string | null,
  permanentFailure = false,
) {
  return finalizeAnalyticsDeliveryFn(event, provider, result, leaseToken, permanentFailure)
}

async function finalizeAnalyticsDeliveryFn(
  event: CanonicalCommerceEvent,
  provider: AnalyticsProviderId,
  result: HttpDeliveryResult,
  leaseToken: string | null,
  permanentFailure = false,
) {
  return finalizeDelivery(event, provider, result, leaseToken, permanentFailure)
}

async function finalizeDelivery(
  event: CanonicalCommerceEvent,
  provider: AnalyticsProviderId,
  result: HttpDeliveryResult,
  leaseToken: string | null,
  permanentFailure = false,
) {
  return recordDeliveryResult(event, provider, result, leaseToken, permanentFailure)
}

async function recordDeliveryResult(
  event: CanonicalCommerceEvent,
  provider: AnalyticsProviderId,
  result: HttpDeliveryResult,
  leaseToken: string | null,
  permanentFailure = false,
) {
  const module = await import('./delivery-ledger')
  return module.recordDeliveryResult(event, provider, result, leaseToken, permanentFailure)
}

export async function processAnalyticsDeliveryWorker(limit = DEFAULT_BATCH_SIZE) {
  const config = await getAnalyticsConfig()
  const entries = await claimAnalyticsDeliveryBatch(Math.min(Math.max(limit, 1), 100))
  const results: Array<{
    eventId: string
    provider: AnalyticsProviderId
    ok: boolean
    skipped: boolean
    dead: boolean
    reason?: string
    category?: string
    attemptNumber?: number
  }> = []

  for (let index = 0; index < entries.length; index += DELIVERY_CONCURRENCY) {
    const chunk = entries.slice(index, index + DELIVERY_CONCURRENCY)
    const processed = await Promise.all(chunk.map((entry) => processEntry(entry, config)))
    results.push(...processed)
  }

  return {
    ok: results.every((result) => result.ok || result.skipped),
    claimed: entries.length,
    attempted: results.filter((result) => !result.skipped).length,
    succeeded: results.filter((result) => result.ok && !result.skipped).length,
    failed: results.filter((result) => !result.ok && !result.skipped).length,
    skipped: results.filter((result) => result.skipped).length,
    dead: results.filter((result) => result.dead).length,
    maxAttempts: ANALYTICS_MAX_DELIVERY_ATTEMPTS,
    results,
  }
}
