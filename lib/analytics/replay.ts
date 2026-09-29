import 'server-only'

import { getAnalyticsConfig } from './server'
import { ANALYTICS_PROVIDER_ADAPTERS } from './provider-adapters'
import { listRetryableDeliveries, recordDeliveryResult } from './delivery-ledger'

export async function replayFailedAnalyticsDeliveries(limit = 20) {
  const config = await getAnalyticsConfig()
  const entries = await listRetryableDeliveries(limit)
  const results = await Promise.all(entries.map(async (entry) => {
    const adapter = ANALYTICS_PROVIDER_ADAPTERS[entry.provider]
    if (!adapter || !adapter.canDispatch(entry.event_payload, config)) {
      return { eventId: entry.event_id, provider: entry.provider, ok: false, skipped: true, reason: 'PROVIDER_NOT_ELIGIBLE' as const }
    }

    try {
      const delivery = await adapter.dispatch(entry.event_payload, config)
      await recordDeliveryResult(entry.event_payload, entry.provider, delivery)
      return { eventId: entry.event_id, provider: entry.provider, ok: delivery.ok, skipped: false, category: delivery.category }
    } catch (error) {
      const failure = {
        ok: false,
        latency: 0,
        attempts: 0,
        category: 'NETWORK_ERROR' as const,
        responseBody: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
      }
      await recordDeliveryResult(entry.event_payload, entry.provider, failure)
      return { eventId: entry.event_id, provider: entry.provider, ok: false, skipped: false, category: failure.category }
    }
  }))

  return {
    ok: results.every((result) => result.ok || result.skipped),
    attempted: results.filter((result) => !result.skipped).length,
    succeeded: results.filter((result) => result.ok).length,
    skipped: results.filter((result) => result.skipped).length,
    failed: results.filter((result) => !result.ok && !result.skipped).length,
    results,
  }
}
