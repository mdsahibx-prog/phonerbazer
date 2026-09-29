'use client'

import type { CanonicalCommerceEvent, CommerceEventName } from './types'
import { dispatchBrowserAnalyticsEvent, initializeBrowserAnalyticsProviders } from './browser-registry'
import { DEFAULT_ANALYTICS_PROJECT_CONFIG, normalizeAnalyticsCurrency, normalizeAnalyticsProjectKey } from './project-config'

type Consent = { necessary: true; analytics: boolean; marketing: boolean }
type ClientEventInput = { eventName: CommerceEventName; commerce?: Record<string, unknown>; metadata?: Record<string, unknown>; eventId?: string; testMode?: boolean }

const CONSENT_KEY = 'commerce-analytics-consent-v1'
const ATTRIBUTION_KEY = 'commerce-analytics-attribution-v1'
const ANON_KEY = 'commerce-analytics-anonymous-id-v1'
const SESSION_KEY = 'commerce-analytics-session-id-v1'
const LEGACY_CONSENT_KEY = 'sahigadget-analytics-consent'
const LEGACY_ATTRIBUTION_KEY = 'sahigadget-attribution'
const LEGACY_ANON_KEY = 'sahigadget-anonymous-id'
const LEGACY_SESSION_KEY = 'sahigadget-session-id'
let runtimeConfig = { ...DEFAULT_ANALYTICS_PROJECT_CONFIG, enabled: false, marketingEnabled: false, ga4MeasurementId: '', gtmContainerId: '', metaPixelId: '', tiktokPixelId: '', ga4ServerDeliveryEnabled: false }
type GtmRuntime = { id: string; status: 'loading' | 'ready' | 'error'; startedAt?: number; readyAt?: number; errorAt?: number }

export function configureAnalyticsRuntime(config: { projectKey?: string; currency?: string; enabled: boolean; marketingEnabled: boolean; ga4MeasurementId: string; gtmContainerId: string; metaPixelId: string; tiktokPixelId?: string; ga4ServerDeliveryEnabled?: boolean }) {
  runtimeConfig = {
    projectKey: normalizeAnalyticsProjectKey(config.projectKey),
    currency: normalizeAnalyticsCurrency(config.currency),
    enabled: config.enabled,
    marketingEnabled: config.marketingEnabled,
    ga4MeasurementId: config.ga4MeasurementId.trim(),
    gtmContainerId: config.gtmContainerId.trim().toUpperCase(),
    metaPixelId: config.metaPixelId.trim(),
    tiktokPixelId: config.tiktokPixelId?.trim() || '',
    ga4ServerDeliveryEnabled: Boolean(config.ga4ServerDeliveryEnabled),
  }
  if (typeof window !== 'undefined') initializeBrowserAnalyticsProviders(runtimeConfig)
}

export function trackClientEvent(input: ClientEventInput) {
  if (typeof window === 'undefined') return
  const currentConsent = consent()
  const attributionData = attribution()
  const commerce = input.commerce ? { currency: runtimeConfig.currency, ...input.commerce } : input.commerce
  const event: CanonicalCommerceEvent = { eventId: input.eventId || crypto.randomUUID(), eventName: input.eventName, eventVersion: '1.0', occurredAt: new Date().toISOString(), sessionId: sessionId(), anonymousId: id(ANON_KEY, LEGACY_ANON_KEY), pageUrl: window.location.href, pagePath: window.location.pathname, referrer: document.referrer || null, source: attributionData.utm_source || null, medium: attributionData.utm_medium || null, campaign: attributionData.utm_campaign || null, device: { type: /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop', language: navigator.language }, consent: currentConsent, commerce: commerce ? { ...commerce, ...attributionData } : attributionData, metadata: input.metadata as Record<string, string | number | boolean | null> | undefined, testMode: input.testMode }
  if (currentConsent.analytics || currentConsent.marketing || input.testMode) {
    window.dispatchEvent(new CustomEvent('commerce-analytics-event', { detail: event }))
    const body = JSON.stringify(event)
    try {
      const blob = new Blob([body], { type: 'application/json' })
      if (!navigator.sendBeacon('/api/analytics', blob)) void fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined)
    } catch {
      void fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined)
    }
  }
  dispatchBrowserAnalyticsEvent(event, runtimeConfig)
  return event
}

export function trackPageView() { return trackClientEvent({ eventName: 'page_view' }) }
