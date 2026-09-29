'use client'

import type { CanonicalCommerceEvent } from './types'

export type BrowserAnalyticsRuntimeConfig = {
  enabled: boolean
  marketingEnabled: boolean
  ga4MeasurementId: string
  gtmContainerId: string
  metaPixelId: string
  tiktokPixelId: string
  ga4ServerDeliveryEnabled: boolean
}

export type BrowserProviderId = 'GTM' | 'GA4' | 'META_PIXEL' | 'TIKTOK_PIXEL'

export function dispatchBrowserAnalyticsEvent(_event: CanonicalCommerceEvent, _config: BrowserAnalyticsRuntimeConfig) {
  // Provider adapters are intentionally isolated here; implementation follows in this phase.
}

export function initializeBrowserAnalyticsProviders(_config: BrowserAnalyticsRuntimeConfig) {}
