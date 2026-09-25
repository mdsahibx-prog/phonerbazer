import { canonicalCommerceEventSchema } from '../lib/analytics/events'

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
