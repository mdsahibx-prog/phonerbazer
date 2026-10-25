'use server'

import { z } from 'zod'
import { revalidatePath, updateTag } from 'next/cache'
import { requireAdmin } from './auth'
import { writeAdminAuditLog } from './audit'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_ANALYTICS_CONFIG, type AnalyticsConfig } from '@/lib/analytics/server'
import { recordCanonicalEvent } from '@/lib/analytics/events'
import { ANALYTICS_EVENT_REGISTRY } from '@/lib/analytics/registry'
import { isValidServerGtmEndpoint, normalizeServerGtmEndpoint, serverGtmSigningConfigured } from '@/lib/analytics/server-gtm'
import { normalizeAnalyticsCurrency, normalizeAnalyticsProjectKey } from '@/lib/analytics/project-config'
import { replayFailedAnalyticsDeliveries } from '@/lib/analytics/replay'
import { ANALYTICS_PROVIDER_ADAPTERS } from '@/lib/analytics/provider-adapters'

const configSchema = z.object({ projectKey: z.string().trim().max(64).refine((value) => /^[a-z0-9][a-z0-9_-]{1,63}$/i.test(value), 'Use a simple project key (letters, numbers, _ or -).'), currency: z.string().trim().length(3).regex(/^[A-Za-z]{3}$/, 'Use a 3-letter ISO 4217 currency code.'), enabled: z.boolean(), marketingEnabled: z.boolean(), consentMode: z.enum(['basic', 'advanced']), debugMode: z.boolean(), ga4MeasurementId: z.string().trim().max(100).refine((value) => !value || /^G-[A-Z0-9]+$/i.test(value), 'Invalid GA4 Measurement ID.'), gtmContainerId: z.string().trim().max(100).refine((value) => !value || /^GTM-[A-Z0-9]+$/i.test(value), 'Invalid GTM Container ID.'), metaPixelId: z.string().trim().max(100), metaCapiEnabled: z.boolean(), tiktokPixelId: z.string().trim().max(100), tiktokEventsApiEnabled: z.boolean(), serverGtmEnabled: z.boolean(), serverGtmEndpoint: z.string().trim().max(2048).refine(isValidServerGtmEndpoint, 'Use a canonical HTTPS server container URL.'), environment: z.enum(['development', 'preview', 'production']), eventControls: z.record(z.string(), z.boolean()).default({}) }).strict()

export async function getAnalyticsAdminConfig() { try { await requireAdmin(['OWNER', 'ADMIN']); const db = createAdminClient(); const { data } = await db.from('settings').select('value').eq('key', 'analytics_config').maybeSingle(); const stored = (data?.value as Partial<AnalyticsConfig> | null) || {}; return { ...DEFAULT_ANALYTICS_CONFIG, ...stored, projectKey: normalizeAnalyticsProjectKey(stored.projectKey), currency: normalizeAnalyticsCurrency(stored.currency), eventControls: { ...DEFAULT_ANALYTICS_CONFIG.eventControls, ...(stored.eventControls || {}) } } } catch { return DEFAULT_ANALYTICS_CONFIG } }

export async function saveAnalyticsConfig(input: unknown) {
  try {
    const session = await requireAdmin(['OWNER', 'ADMIN'])
    const parsed = configSchema.parse(input)
    const normalized = { ...parsed, projectKey: normalizeAnalyticsProjectKey(parsed.projectKey), currency: normalizeAnalyticsCurrency(parsed.currency), serverGtmEndpoint: normalizeServerGtmEndpoint(parsed.serverGtmEndpoint) }

    if (normalized.serverGtmEnabled && !normalized.serverGtmEndpoint) {
      return { ok: false, message: 'Server-side GTM needs a valid HTTPS endpoint before it can be enabled.' }
    }
    if (normalized.serverGtmEnabled && !serverGtmSigningConfigured()) {
      return { ok: false, message: 'Server-side GTM needs SERVER_GTM_HMAC_SECRET configured in the deployment before it can be enabled.' }
    }

    const db = createAdminClient()
    const { error } = await db.from('settings').upsert({ key: 'analytics_config', value: normalized, description: 'Provider-neutral analytics configuration. Credentials remain server environment secrets.', updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw error
    updateTag('analytics-config')
    await writeAdminAuditLog({
      actorUserId: session.userId,
      action: 'ANALYTICS_CONFIG_UPDATED',
      entityType: 'analytics_config',
      details: {
        projectKey: normalized.projectKey,
        currency: normalized.currency,
        enabled: normalized.enabled,
        marketingEnabled: normalized.marketingEnabled,
        consentMode: normalized.consentMode,
        debugMode: normalized.debugMode,
        ga4Configured: Boolean(normalized.ga4MeasurementId),
        gtmConfigured: Boolean(normalized.gtmContainerId),
        metaPixelConfigured: Boolean(normalized.metaPixelId),
        metaCapiEnabled: normalized.metaCapiEnabled,
        tiktokPixelConfigured: Boolean(normalized.tiktokPixelId),
        tiktokEventsApiEnabled: normalized.tiktokEventsApiEnabled,
        serverGtmEnabled: normalized.serverGtmEnabled,
        serverGtmConfigured: Boolean(normalized.serverGtmEndpoint),
        serverGtmSigningConfigured: serverGtmSigningConfigured(),
        eventControlCount: Object.keys(normalized.eventControls).length,
        environment: normalized.environment,
      },
    })
    revalidatePath('/admin/analytics')
    return { ok: true, message: 'Analytics configuration saved.' }
  } catch {
    return { ok: false, message: 'Unable to save analytics configuration.' }
  }
}

export async function testAnalyticsEvent(eventName: 'page_view' | 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase') { try { const session = await requireAdmin(['OWNER', 'ADMIN']); const analyticsConfig = await (await import('@/lib/analytics/server')).getAnalyticsConfig(); const event = { eventId: crypto.randomUUID(), eventName, eventVersion: '1.0' as const, occurredAt: new Date().toISOString(), sessionId: 'admin-test', anonymousId: null, pageUrl: null, pagePath: null, referrer: null, source: 'admin-test', medium: null, campaign: null, device: null, consent: { necessary: true as const, analytics: true, marketing: true }, commerce: eventName === 'purchase' ? { transaction_id: `TEST-${Date.now()}`, value: 0, currency: analyticsConfig.currency, items: [] } : {}, testMode: true as const }; const result = await recordCanonicalEvent({ ...event, testMode: true }); await writeAdminAuditLog({ actorUserId: session.userId, action: 'ANALYTICS_TEST_EVENT', entityType: 'analytics_config', details: { eventName, testMode: true, accepted: result.ok, destinations: [] } }); return result.ok ? { ok: true, message: `${eventName} synthetic test recorded safely. No live provider event was sent.` } : { ok: false, message: 'Unable to record analytics synthetic test.' } } catch { return { ok: false, message: 'Unable to run analytics synthetic test.' } } }

export async function validateGa4AnalyticsEvent() {
  try {
    const session = await requireAdmin(['OWNER', 'ADMIN'])
    const analyticsConfig = await (await import('@/lib/analytics/server')).getAnalyticsConfig()
    const adapter = ANALYTICS_PROVIDER_ADAPTERS.GA4
    if (!analyticsConfig.ga4MeasurementId || !process.env.GA4_API_SECRET) {
      return { ok: false, message: 'GA4 validation requires a Measurement ID and server API secret.' }
    }
    const event = {
      eventId: crypto.randomUUID(),
      eventName: 'page_view' as const,
      eventVersion: '1.0' as const,
      occurredAt: new Date().toISOString(),
      sessionId: crypto.randomUUID(),
      anonymousId: crypto.randomUUID(),
      pageUrl: 'https://example.test/analytics-validation',
      pagePath: '/analytics-validation',
      referrer: null,
      source: 'admin-validation',
      medium: null,
      campaign: null,
      device: { type: 'server', language: 'en' },
      consent: { necessary: true as const, analytics: true, marketing: false },
      commerce: {},
      metadata: { validation: true },
      testMode: true,
    }
    if (!adapter.validate) return { ok: false, message: 'GA4 validation adapter is unavailable.' }
    const result = await adapter.validate(event, analyticsConfig)
    await writeAdminAuditLog({ actorUserId: session.userId, action: 'ANALYTICS_GA4_VALIDATION', entityType: 'analytics_config', details: { ok: result.ok, status: result.status ?? null, category: result.category ?? null } })
    return result.ok
      ? { ok: true, message: 'GA4 synthetic payload passed the validation endpoint. No live report event was sent.' }
      : { ok: false, message: 'GA4 payload validation failed. The live collection endpoint was not called.' }
  } catch {
    return { ok: false, message: 'Unable to validate the GA4 analytics payload.' }
  }
}

export async function retryFailedAnalyticsDeliveries(limit = 20) {
  try {
    const session = await requireAdmin(['OWNER', 'ADMIN'])
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50)
    const result = await replayFailedAnalyticsDeliveries(safeLimit)
    await writeAdminAuditLog({
      actorUserId: session.userId,
      action: 'ANALYTICS_DELIVERY_REPLAY',
      entityType: 'analytics_delivery',
      details: { requested: safeLimit, attempted: result.attempted, succeeded: result.succeeded, failed: result.failed, skipped: result.skipped },
    })
    return { ok: result.ok, message: result.attempted + ' delivery attempt(s), ' + result.succeeded + ' succeeded, ' + result.failed + ' failed, ' + result.skipped + ' skipped.' }
  } catch {
    return { ok: false, message: 'Unable to replay failed analytics deliveries.' }
  }
}

export async function getAnalyticsEventOptions() { await requireAdmin(['OWNER', 'ADMIN']); return ANALYTICS_EVENT_REGISTRY.map(({ name, category, marketing, required, description }) => ({ name, category, marketing, required, description })) }
