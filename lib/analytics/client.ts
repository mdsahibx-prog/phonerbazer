'use client'

import type { CanonicalCommerceEvent, CommerceEventName } from './types'

type Consent = { necessary: true; analytics: boolean; marketing: boolean }
type ClientEventInput = { eventName: CommerceEventName; commerce?: Record<string, unknown>; metadata?: Record<string, unknown>; eventId?: string; testMode?: boolean }

const CONSENT_KEY = 'sahigadget-analytics-consent'
const ATTRIBUTION_KEY = 'sahigadget-attribution'
const ANON_KEY = 'sahigadget-anonymous-id'
const SESSION_KEY = 'sahigadget-session-id'
let runtimeConfig = { enabled: false, marketingEnabled: false, ga4MeasurementId: '', gtmContainerId: '', metaPixelId: '', tiktokPixelId: '' }
const initializedMetaPixelIds = new Set<string>()
const initializedTikTokPixelIds = new Set<string>()
let initializedGa4MeasurementId = ''

type GtmRuntime = { id: string; status: 'loading' | 'ready' | 'error'; startedAt?: number; readyAt?: number; errorAt?: number }

function getWindow() {
  return window as typeof window & { dataLayer?: unknown[]; __PHONERBAZAR_GTM__?: GtmRuntime; gtag?: (...args: unknown[]) => void; ttq?: { load?: (id: string) => void; page?: () => void; track?: (name: string, properties?: Record<string, unknown>) => void; _i?: Record<string, unknown> } }
}

export function configureAnalyticsRuntime(config: { enabled: boolean; marketingEnabled: boolean; ga4MeasurementId: string; gtmContainerId: string; metaPixelId: string; tiktokPixelId?: string }) {
  runtimeConfig = { enabled: config.enabled, marketingEnabled: config.marketingEnabled, ga4MeasurementId: config.ga4MeasurementId.trim(), gtmContainerId: config.gtmContainerId.trim().toUpperCase(), metaPixelId: config.metaPixelId.trim(), tiktokPixelId: config.tiktokPixelId?.trim() || '' }
  if (typeof window !== 'undefined') initializeGtm()
}

export function initializeGtm() {
  if (typeof window === 'undefined' || !runtimeConfig.enabled || !runtimeConfig.gtmContainerId) return false
  const w = getWindow()
  w.dataLayer = w.dataLayer || []
  const existing = w.__PHONERBAZAR_GTM__
  if (existing?.id === runtimeConfig.gtmContainerId && (existing.status === 'loading' || existing.status === 'ready')) return true
  const scriptId = 'phonerbazar-gtm'
  const existingScript = document.getElementById(scriptId)
  if (existingScript) {
    if (!w.__PHONERBAZAR_GTM__) w.__PHONERBAZAR_GTM__ = { id: runtimeConfig.gtmContainerId, status: 'loading', startedAt: Date.now() }
    return true
  }
  {
    const script = document.createElement('script')
    script.id = scriptId
    script.async = true
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(runtimeConfig.gtmContainerId)
    w.__PHONERBAZAR_GTM__ = { id: runtimeConfig.gtmContainerId, status: 'loading', startedAt: Date.now() }
    script.onload = () => { if (w.__PHONERBAZAR_GTM__) { w.__PHONERBAZAR_GTM__.status = 'ready'; w.__PHONERBAZAR_GTM__.readyAt = Date.now() }; window.dispatchEvent(new CustomEvent('phonerbazar-gtm-ready')) }
    script.onerror = () => { if (w.__PHONERBAZAR_GTM__) { w.__PHONERBAZAR_GTM__.status = 'error'; w.__PHONERBAZAR_GTM__.errorAt = Date.now() }; window.dispatchEvent(new CustomEvent('phonerbazar-gtm-error')) }
    document.head.appendChild(script)
  }
  return true
}

function id(key: string) { const existing = window.localStorage.getItem(key); if (existing) return existing; const value = crypto.randomUUID(); window.localStorage.setItem(key, value); return value }
function sessionId() { const existing = window.sessionStorage.getItem(SESSION_KEY); if (existing) return existing; const value = crypto.randomUUID(); window.sessionStorage.setItem(SESSION_KEY, value); return value }
function consent(): Consent { try { const value = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || 'null') as Partial<Consent> | string | null; if (value && typeof value === 'object') return { necessary: true, analytics: Boolean(value.analytics), marketing: Boolean(value.marketing) }; return { necessary: true, analytics: value === 'granted', marketing: false } } catch { return { necessary: true, analytics: false, marketing: false } } }
function attribution() { const url = new URL(window.location.href); const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ttclid']; const current = Object.fromEntries(keys.map((key) => [key, url.searchParams.get(key)]).filter(([, value]) => value)); const prior = JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY) || '{}') as Record<string, string>; const merged = { ...current, ...prior }; if (Object.keys(current).length) window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ ...merged, landing_page: prior.landing_page || window.location.pathname })); return merged }
function loadScript(src: string, idValue: string) { if (document.getElementById(idValue)) return; const script = document.createElement('script'); script.id = idValue; script.async = true; script.src = src; document.head.appendChild(script) }

export function hasAnalyticsConsent() { return window.localStorage.getItem(CONSENT_KEY) !== null }
export function getAnalyticsConsent() { return consent() }
function pushGtmConsent(next: Consent) {
  if (typeof window === 'undefined') return
  const w = getWindow()
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push(['consent', 'update', {
    analytics_storage: next.analytics ? 'granted' : 'denied',
    ad_storage: next.marketing ? 'granted' : 'denied',
    ad_user_data: next.marketing ? 'granted' : 'denied',
    ad_personalization: next.marketing ? 'granted' : 'denied',
  }])
}
export function setAnalyticsConsent(value: Consent | 'granted' | 'denied') {
  const next: Consent = typeof value === 'string'
    ? { necessary: true, analytics: value === 'granted', marketing: false }
    : { necessary: true, analytics: Boolean(value.analytics), marketing: Boolean(value.marketing) }
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(next))
  pushGtmConsent(next)
  window.dispatchEvent(new CustomEvent('phonerbazar-consent-change'))
}

export function trackClientEvent(input: ClientEventInput) {
  if (typeof window === 'undefined') return
  const currentConsent = consent()
  const attributionData = attribution()
  const event: CanonicalCommerceEvent = { eventId: input.eventId || crypto.randomUUID(), eventName: input.eventName, eventVersion: '1.0', occurredAt: new Date().toISOString(), sessionId: sessionId(), anonymousId: id(ANON_KEY), pageUrl: window.location.href, pagePath: window.location.pathname, referrer: document.referrer || null, source: attributionData.utm_source || null, medium: attributionData.utm_medium || null, campaign: attributionData.utm_campaign || null, device: { type: /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop', language: navigator.language }, consent: currentConsent, commerce: { ...input.commerce, ...attributionData }, metadata: input.metadata as Record<string, string | number | boolean | null> | undefined, testMode: input.testMode }
  if (currentConsent.analytics || currentConsent.marketing || input.testMode) { window.dispatchEvent(new CustomEvent('sahigadget-analytics-event', { detail: event })); void fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event), keepalive: true }).catch(() => undefined) }
  const w = getWindow()
  const gtmRuntimeActive = Boolean(w.__PHONERBAZAR_GTM__ || document.getElementById('phonerbazar-gtm') || w.dataLayer)
  if (gtmRuntimeActive && (currentConsent.analytics || currentConsent.marketing || input.testMode)) {
    initializeGtm()
    w.dataLayer = w.dataLayer || []
    w.dataLayer.push({ ecommerce: null })
    w.dataLayer.push({ event: input.eventName, event_id: event.eventId, event_version: event.eventVersion, ecommerce: event.commerce, attribution: attributionData, test_mode: Boolean(input.testMode) })
  }
  if (runtimeConfig.enabled && currentConsent.analytics && !input.testMode) { const idValue = runtimeConfig.ga4MeasurementId; if (idValue) { const w = window as typeof window & { gtag?: (...args: unknown[]) => void }; w.gtag = w.gtag || function (...args: unknown[]) { (w as typeof w & { dataLayer?: unknown[] }).dataLayer = (w as typeof w & { dataLayer?: unknown[] }).dataLayer || []; (w as typeof w & { dataLayer?: unknown[] }).dataLayer?.push(args) }; loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(idValue)}`, 'sahigadget-ga4'); if (initializedGa4MeasurementId !== idValue) { w.gtag('js', new Date()); w.gtag('config', idValue, { send_page_view: false }); initializedGa4MeasurementId = idValue } w.gtag('event', event.eventName, { ...event.commerce, event_id: event.eventId }) } }
  const pixelIds = runtimeConfig.metaPixelId.split(/[\\s,]+/).map((value) => value.trim()).filter(Boolean)
  if (runtimeConfig.enabled && runtimeConfig.marketingEnabled && currentConsent.marketing && !input.testMode && pixelIds.length) { const w = window as typeof window & { fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; push?: (...args: unknown[]) => void; loaded?: boolean; version?: string }; _fbq?: unknown }; if (!w.fbq) { const fbq = function (this: unknown, ...args: unknown[]) { if (fbq.callMethod) fbq.callMethod.apply(this, args); else fbq.queue?.push(args) } as ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; push?: (...args: unknown[]) => void; loaded?: boolean; version?: string }; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = []; w.fbq = fbq; w._fbq = fbq }; loadScript('https://connect.facebook.net/en_US/fbevents.js', 'sahigadget-meta-pixel'); const metaEvent = input.eventName === 'view_item' ? 'ViewContent' : input.eventName === 'add_to_cart' ? 'AddToCart' : input.eventName === 'begin_checkout' ? 'InitiateCheckout' : input.eventName === 'purchase' ? 'Purchase' : input.eventName === 'search' ? 'Search' : input.eventName === 'contact' ? 'Contact' : 'PageView'; for (const pixelId of pixelIds) { if (!initializedMetaPixelIds.has(pixelId)) { w.fbq('init', pixelId); initializedMetaPixelIds.add(pixelId) } w.fbq('track', metaEvent, { ...event.commerce, eventID: event.eventId }) } }
  if (runtimeConfig.enabled && runtimeConfig.marketingEnabled && currentConsent.marketing && !input.testMode && runtimeConfig.tiktokPixelId) {
    const w = getWindow()
    if (!w.ttq) { const queue: unknown[] = []; w.ttq = { load: (id: string) => queue.push(['load', id]), page: () => queue.push(['page']), track: (name: string, properties?: Record<string, unknown>) => queue.push(['track', name, properties || {}]), _i: {} } }
    loadScript('https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + encodeURIComponent(runtimeConfig.tiktokPixelId), 'sahigadget-tiktok-pixel')
    if (!initializedTikTokPixelIds.has(runtimeConfig.tiktokPixelId)) { w.ttq?.load?.(runtimeConfig.tiktokPixelId); w.ttq?.page?.(); initializedTikTokPixelIds.add(runtimeConfig.tiktokPixelId) }
    const tiktokEvent = ({ page_view: 'PageView', view_item: 'ViewContent', search: 'Search', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'CompletePayment', generate_lead: 'SubmitForm', contact: 'Contact', sign_up: 'CompleteRegistration' } as Record<string, string>)[input.eventName]
    if (tiktokEvent) w.ttq?.track?.(tiktokEvent, { ...event.commerce, event_id: event.eventId })
  }
  return event
}

export function trackPageView() { return trackClientEvent({ eventName: 'page_view' }) }
