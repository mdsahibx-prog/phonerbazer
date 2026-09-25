import { canonicalCommerceEventSchema } from '../lib/analytics/events'
import { normalizeServerGtmEndpoint, isValidServerGtmEndpoint, buildServerGtmEnvelope } from '../lib/analytics/server-gtm'

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

const unknown = { ...base, unexpected: 'should be rejected' }
if (canonicalCommerceEventSchema.safeParse(unknown).success) {
  throw new Error('Unknown analytics fields were accepted.')
}

console.log('analytics contract tests passed')


if (normalizeServerGtmEndpoint('https://gtm.example.com/') !== 'https://gtm.example.com') throw new Error('Server GTM endpoint normalization failed.')
if (isValidServerGtmEndpoint('http://gtm.example.com')) throw new Error('Non-HTTPS Server GTM endpoint was accepted.')
if (isValidServerGtmEndpoint('https://gtm.example.com/path?bad=1')) throw new Error('Non-canonical Server GTM endpoint was accepted.')
const envelope = buildServerGtmEnvelope(base)
if (envelope.schema !== 'phonerbazar.analytics.event' || envelope.event.id !== base.eventId) throw new Error('Server GTM envelope contract failed.')
