import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordCanonicalEvent, type CanonicalCommerceEvent } from './events'
import { ANALYTICS_EVENT_MAP } from './registry'
import { ANALYTICS_PROVIDER_ADAPTERS, type AnalyticsProviderId } from './provider-adapters'
import { ensureDeliveryLedgerEntry, recordDeliveryResult } from './delivery-ledger'
import { DEFAULT_ANALYTICS_PROJECT_CONFIG, normalizeAnalyticsCurrency, normalizeAnalyticsProjectKey } from './project-config'

export type AnalyticsConfig = { projectKey: string; currency: string; enabled: boolean; marketingEnabled: boolean; consentMode: 'basic' | 'advanced'; debugMode: boolean; ga4MeasurementId: string; gtmContainerId: string; metaPixelId: string; metaCapiEnabled: boolean; tiktokPixelId: string; tiktokEventsApiEnabled: boolean; serverGtmEnabled: boolean; serverGtmEndpoint: string; environment: 'development' | 'preview' | 'production'; eventControls: Record<string, boolean> }
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = { ...DEFAULT_ANALYTICS_PROJECT_CONFIG, enabled: false, marketingEnabled: false, consentMode: 'advanced', debugMode: false, ga4MeasurementId: '', gtmContainerId: '', metaPixelId: '', metaCapiEnabled: false, tiktokPixelId: '', tiktokEventsApiEnabled: false, serverGtmEnabled: false, serverGtmEndpoint: '', environment: process.env.VERCEL_ENV === 'production' ? 'production' : process.env.VERCEL_ENV === 'preview' ? 'preview' : 'development', eventControls: {} }

const readConfig = unstable_cache(async (): Promise<AnalyticsConfig> => { try { const db = createAdminClient(); const { data } = await db.from('settings').select('value').eq('key', 'analytics_config').maybeSingle(); const stored = (data?.value as Partial<AnalyticsConfig> | null) || {}; return { ...DEFAULT_ANALYTICS_CONFIG, ...stored, projectKey: normalizeAnalyticsProjectKey(stored.projectKey), currency: normalizeAnalyticsCurrency(stored.currency), eventControls: { ...DEFAULT_ANALYTICS_CONFIG.eventControls, ...(stored.eventControls || {}) }, environment: DEFAULT_ANALYTICS_CONFIG.environment } } catch { return DEFAULT_ANALYTICS_CONFIG } }, ['analytics-config-v2'], { revalidate: 60, tags: ['analytics-config'] });
export async function getAnalyticsConfig() { return readConfig() }

export async function dispatchAnalyticsEvent(event: CanonicalCommerceEvent) {
  const config = await readConfig()
  const definition = ANALYTICS_EVENT_MAP[event.eventName]
  const allows = (provider: AnalyticsProviderId) => Boolean(definition?.providers.includes(provider))
  const masterAllowed = config.enabled &&
    (definition?.required || config.eventControls[event.eventName] !== false) &&
    (event.consent.analytics || event.consent.marketing || event.testMode === true) &&
    !(config.environment === 'development' && !config.debugMode)

  if (!masterAllowed) return { ok: true, skipped: true, destinations: [] as string[] }

  const adapters = ANALYTICS_PROVIDER_ADAPTERS[Symbol.iterator]
    ? Object.values(ANALYTICS_PROVIDER_ADAPTERS).filter((adapter) => allows(adapter.id) && adapter.canDispatch(event, config))
    : []
  await Promise.all(adapters.map((adapter) => ensureDeliveryLedgerEntry(event, adapter.id)))

  const deliveryResults = await Promise.allSettled(adapters.map(async (adapter) => {
    const result = await adapter.dispatch(event, config)
    await recordDeliveryResult(event, adapter.id, result)
    return { destination: adapter.id, ...result }
  }))

  const deliveries = deliveryResults
    .filter((item): item is PromiseFulfilledResult<{ destination: AnalyticsProviderId; ok: boolean; latency: number; status?: number; category?: string; responseBody?: string; attempts: number }> => item.status === 'fulfilled')
    .map((item) => ({
      destination: item.value.destination,
      ok: item.value.ok,
      latency: item.value.latency,
      status: item.value.status,
      category: item.value.category,
    }))

  return {
    ok: deliveries.every((item) => item.ok),
    skipped: false,
    deliveries,
    destinations: adapters.map((adapter) => adapter.id),
  }
}

export async function trackServerCommerceEvent(input: CanonicalCommerceEvent & { orderId?: string | null; cartId?: string | null }) { try { const persisted = await recordCanonicalEvent(input); if (!persisted.ok || persisted.duplicate) return { ...persisted, deliveries: [] }; return { ...persisted, ...(await dispatchAnalyticsEvent(input)) } } catch { return { ok: true, skipped: true, deliveries: [] } }
}
