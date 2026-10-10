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
let runtimeConfig = { ...DEFAULT_ANALYTICS_PROJECT_CONFIG, enabled: false, marketingEnabled: false, ga4MeasurementId: '', gtmContainerId: '', metaPixelId: '', tiktokPixelId: '', ga4ServerDeliveryEnabled: false, eventControls: {} as Record<string, boolean> }
function migratedLocalStorage(key: string, legacyKey: string) { const existing = window.localStorage.getItem(key); if (existing !== null) return existing; const legacy = window.localStorage.getItem(legacyKey); if (legacy !== null) { window.localStorage.setItem(key, legacy); return legacy }; return null }
function migratedSessionStorage(key: string, legacyKey: string) { const existing = window.sessionStorage.getItem(key); if (existing !== null) return existing; const legacy = window.sessionStorage.getItem(legacyKey); if (legacy !== null) { window.sessionStorage.setItem(key, legacy); return legacy }; return null }
function id(key: string, legacyKey?: string) { const existing = legacyKey ? migratedLocalStorage(key, legacyKey) : window.localStorage.getItem(key); if (existing) return existing; const value = crypto.randomUUID(); window.localStorage.setItem(key, value); return value }
function sessionId() { const existing = migratedSessionStorage(SESSION_KEY, LEGACY_SESSION_KEY); if (existing) return existing; const value = crypto.randomUUID(); window.sessionStorage.setItem(SESSION_KEY, value); return value }
function consent(): Consent { try { const value = JSON.parse(migratedLocalStorage(CONSENT_KEY, LEGACY_CONSENT_KEY) || 'null') as Partial<Consent> | string | null; if (value && typeof value === 'object') return { necessary: true, analytics: Boolean(value.analytics), marketing: Boolean(value.marketing) }; return { necessary: true, analytics: value === 'granted', marketing: false } } catch { return { necessary: true, analytics: false, marketing: false } } }
function attribution() { const url = new URL(window.location.href); const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ttclid']; const current = Object.fromEntries(keys.map((key) => [key, url.searchParams.get(key)]).filter(([, value]) => value)); const prior = JSON.parse(migratedSessionStorage(ATTRIBUTION_KEY, LEGACY_ATTRIBUTION_KEY) || '{}') as Record<string, string>; const merged = { ...current, ...prior }; if (Object.keys(current).length) window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ ...merged, landing_page: prior.landing_page || window.location.pathname })); return merged }
export function hasAnalyticsConsent() { return migratedLocalStorage(CONSENT_KEY, LEGACY_CONSENT_KEY) !== null }
export function getAnalyticsConsent() { return consent() }
function consentPayload(next: Consent) {
  return {
    analytics_storage: next.analytics ? 'granted' : 'denied',
    ad_storage: next.marketing ? 'granted' : 'denied',
    ad_user_data: next.marketing ? 'granted' : 'denied',
    ad_personalization: next.marketing ? 'granted' : 'denied',
  }
}

function pushGtmConsent(next: Consent, includeDefault = false) {
  if (typeof window === 'undefined') return
  const w = window as typeof window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
  w.dataLayer = w.dataLayer || []
  // Use the documented gtag command queue shape (dataLayer.push(arguments)),
  // not a hand-built nested array that GTM may treat as an ordinary message.
  w.gtag = w.gtag || function () {
    w.dataLayer = w.dataLayer || []
    // Google documents this exact queue shape for Consent Mode commands.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments)
  }
  if (includeDefault) {
    // Consent defaults must be queued before the GTM/gtag script is injected.
    w.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  }
  w.gtag('consent', 'update', consentPayload(next))
}

function hasLoadedGoogleTag() {
  return Boolean(
    document.getElementById('commerce-analytics-gtm') ||
    document.getElementById('commerce-analytics-ga4'),
  )
}

export function setAnalyticsConsent(value: Consent | 'granted' | 'denied') {
  const next: Consent = typeof value === 'string'
    ? { necessary: true, analytics: value === 'granted', marketing: false }
    : { necessary: true, analytics: Boolean(value.analytics), marketing: Boolean(value.marketing) }
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(next))
  // For a first-time choice, configureAnalyticsRuntime will queue default then
  // update before the tag script is injected. After tags load, update in place.
  if (hasLoadedGoogleTag()) pushGtmConsent(next)
  window.dispatchEvent(new CustomEvent('analytics-consent-change'))
}

export function initializeGtm() {
  initializeBrowserAnalyticsProviders(runtimeConfig)
  return Boolean(runtimeConfig.enabled && runtimeConfig.gtmContainerId)
}

export function configureAnalyticsRuntime(config: { projectKey?: string; currency?: string; enabled: boolean; marketingEnabled: boolean; ga4MeasurementId: string; gtmContainerId: string; metaPixelId: string; tiktokPixelId?: string; ga4ServerDeliveryEnabled?: boolean; eventControls?: Record<string, boolean> }) {
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
    eventControls: { ...(config.eventControls || {}) },
  }
  if (typeof window !== 'undefined') {
    const hasConfiguredGoogleTag = Boolean(runtimeConfig.enabled && (runtimeConfig.gtmContainerId || runtimeConfig.ga4MeasurementId))
    const currentConsent = consent()
    if (hasConfiguredGoogleTag && (currentConsent.analytics || currentConsent.marketing)) {
      // Queue both states before any Google tag script loads, including returning visitors.
      pushGtmConsent(currentConsent, true)
      initializeBrowserAnalyticsProviders(runtimeConfig)
    }
  }
}

export function trackClientEvent(input: ClientEventInput) {
  if (typeof window === 'undefined') return
  const currentConsent = consent()
  const attributionData = attribution()
  const commerce = input.commerce ? { currency: runtimeConfig.currency, ...input.commerce } : input.commerce
  const event: CanonicalCommerceEvent = { eventId: input.eventId || crypto.randomUUID(), eventName: input.eventName, eventVersion: '1.0', occurredAt: new Date().toISOString(), sessionId: sessionId(), anonymousId: id(ANON_KEY, LEGACY_ANON_KEY), pageUrl: window.location.href, pagePath: window.location.pathname, referrer: document.referrer || null, source: attributionData.utm_source || null, medium: attributionData.utm_medium || null, campaign: attributionData.utm_campaign || null, device: { type: /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop', language: navigator.language }, consent: currentConsent, commerce: commerce ? { ...commerce, ...attributionData } : attributionData, metadata: input.metadata as Record<string, string | number | boolean | null> | undefined, testMode: input.testMode }
  const hasAnalyticsConsent = currentConsent.analytics || currentConsent.marketing
  if (hasAnalyticsConsent || input.testMode) {
    window.dispatchEvent(new CustomEvent('commerce-analytics-event', { detail: event }))

    // Test-mode events are local diagnostics only and must never enter the public API.
    if (hasAnalyticsConsent && !input.testMode) {
      const body = JSON.stringify(event)
      try {
        const blob = new Blob([body], { type: 'application/json' })
        if (!navigator.sendBeacon('/api/analytics', blob)) {
          void fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined)
        }
      } catch {
        void fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined)
      }
    }
  }
  dispatchBrowserAnalyticsEvent(event, runtimeConfig)
  return event
}

export function trackPageView() { return trackClientEvent({ eventName: 'page_view' }) }
