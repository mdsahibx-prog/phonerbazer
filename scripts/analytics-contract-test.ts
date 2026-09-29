import { canonicalCommerceEventSchema, sanitizeCommerceEvent } from '../lib/analytics/events'
import { analyticsEventSchema, normalizeAnalyticsCurrency, normalizeAnalyticsProjectKey } from '../lib/analytics/project-config'
import { isLiveProviderDispatchAllowed } from '../lib/analytics/provider-policy'
import { normalizeServerGtmEndpoint, isValidServerGtmEndpoint, buildServerGtmEnvelope } from '../lib/analytics/server-gtm'
import { ANALYTICS_PROVIDER_ADAPTERS } from '../lib/analytics/provider-adapters'

const base = {
  eventId: '11111111-1111-4111-8111-111111111111',
  eventName: 'add_to_cart' as const,
  eventVersion: '1.0' as const,
  occurredAt: new Date().toISOString(),
  sessionId: '22222222-2222-4222-8222-222222222222',
  anonymousId: '33333333-3333-4333-8333-333333333333',
  pageUrl: 'https://example.test/products/demo',
  pagePath: '/products/demo',
  referrer: null,
  source: 'google',
  medium: 'organic',
  campaign: null,
  device: { type: 'mobile', language: 'bn-BD' },
  consent: { necessary: true as const, analytics: true, marketing: false },
  commerce: {
    currency: 'BDT',
    value: 1200,
    items: [{ item_id: 'SKU-1', item_name: 'Demo phone', price: 1200, quantity: 1 }],
  },
  metadata: { source: 'test', item_count: 1 },
}

if (!canonicalCommerceEventSchema.safeParse(base).success) {
  throw new Error('Valid canonical analytics event was rejected.')
}

const oversized = { ...base, pagePath: 'x'.repeat(501) }
if (canonicalCommerceEventSchema.safeParse(oversized).success) {
  throw new Error('Oversized analytics field was accepted.')
}

const privateQueryUrl = { ...base, pageUrl: 'https://example.test/product?email=private@example.com&token=secret#fragment' }
const sanitizedPrivateQueryUrl = requireSanitizedUrlCheck(privateQueryUrl)
if (sanitizedPrivateQueryUrl !== 'https://example.test/product') throw new Error('Analytics URL query/hash sanitization failed.')

const unknown = { ...base, unexpected: 'should be rejected' }
if (canonicalCommerceEventSchema.safeParse(unknown).success) {
  throw new Error('Unknown analytics fields were accepted.')
}

function requireSanitizedUrlCheck(event: typeof base) {
  return sanitizeCommerceEvent(event).pageUrl
}

const sanitizedCommerce = sanitizeCommerceEvent({
  ...base,
  commerce: {
    transaction_id: 'ORDER-1',
    items: [{ item_id: 'SKU-1', item_name: 'Demo phone', price: 1200, quantity: 1, phone: 'must-not-survive' }],
    unexpected_nested: { secret: 'must-not-survive' },
  },
})
const sanitizedItems = sanitizedCommerce.commerce?.['items']
const sanitizedItem = Array.isArray(sanitizedItems) ? sanitizedItems[0] as Record<string, unknown> : {}
if ('phone' in sanitizedItem) throw new Error('Nested commerce PII was not removed.')
if ('unexpected_nested' in (sanitizedCommerce.commerce || {})) throw new Error('Unexpected nested commerce data was retained.')

console.log('analytics contract tests passed')


if (normalizeServerGtmEndpoint('https://gtm.example.com/') !== 'https://gtm.example.com') throw new Error('Server GTM endpoint normalization failed.')
if (isValidServerGtmEndpoint('http://gtm.example.com')) throw new Error('Non-HTTPS Server GTM endpoint was accepted.')
if (isValidServerGtmEndpoint('https://gtm.example.com/path?bad=1')) throw new Error('Non-canonical Server GTM endpoint was accepted.')
const envelope = buildServerGtmEnvelope(base, 'demo-store')
if (envelope.schema !== 'demo-store.analytics.event' || envelope.event.id !== base.eventId) throw new Error('Server GTM envelope contract failed.')
if (normalizeAnalyticsProjectKey(' Demo_Store ') !== 'demo_store') throw new Error('Project key normalization failed.')
if (normalizeAnalyticsProjectKey('bad project!') !== 'commerce') throw new Error('Invalid project key was accepted.')
if (normalizeAnalyticsCurrency('bdt') !== 'BDT') throw new Error('Currency normalization failed.')
if (normalizeAnalyticsCurrency('BD') !== 'USD') throw new Error('Invalid currency was accepted.')
if (analyticsEventSchema('demo-store') !== 'demo-store.analytics.event') throw new Error('Analytics event namespace failed.')

if (isLiveProviderDispatchAllowed(true)) throw new Error('Synthetic test events must never be sent to live providers.')
if (!isLiveProviderDispatchAllowed(false)) throw new Error('Live events must remain eligible for provider delivery.')

console.log('live provider dispatch policy tests passed')

for (const provider of ['GA4', 'META_CAPI', 'TIKTOK_EVENTS_API', 'SERVER_GTM'] as const) {
  if (!ANALYTICS_PROVIDER_ADAPTERS[provider]) throw new Error('Missing analytics provider adapter: ' + provider)
  if (ANALYTICS_PROVIDER_ADAPTERS[provider].canDispatch({ ...base, testMode: true }, {
    projectKey: 'demo-store',
    currency: 'USD',
    enabled: true,
    marketingEnabled: true,
    consentMode: 'advanced',
    debugMode: true,
    ga4MeasurementId: 'G-DEMO',
    gtmContainerId: 'GTM-DEMO',
    metaPixelId: '123',
    metaCapiEnabled: true,
    tiktokPixelId: 'TT-DEMO',
    tiktokEventsApiEnabled: true,
    serverGtmEnabled: true,
    serverGtmEndpoint: 'https://gtm.example.com',
    environment: 'production',
    eventControls: {},
  })) throw new Error('Provider adapter canDispatch bypassed safe test mode: ' + provider)
}
console.log('provider adapter registry tests passed')
