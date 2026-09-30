import Module from 'node:module'
import assert from 'node:assert/strict'

type ModuleLoader = (request: string, parent: unknown, isMain: boolean) => unknown
const runtimeModule = Module as unknown as { _load: ModuleLoader }
const originalLoad = runtimeModule._load

runtimeModule._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'server-only') return {}
  if (request === '@/lib/supabase/admin') return { createAdminClient: () => { throw new Error('database access is prohibited in analytics contract tests') } }
  return originalLoad.call(this, request, parent, isMain)
}

async function main() {
  const { canonicalCommerceEventSchema, sanitizeCommerceEvent } = await import('../lib/analytics/events')
  const {
    analyticsEventSchema,
    normalizeAnalyticsCurrency,
    normalizeAnalyticsProjectKey,
  } = await import('../lib/analytics/project-config')
  const { isLiveProviderDispatchAllowed } = await import('../lib/analytics/provider-policy')
  const {
    normalizeServerGtmEndpoint,
    isValidServerGtmEndpoint,
    buildServerGtmEnvelope,
    buildServerGtmRequest,
    SERVER_GTM_CONTRACT_VERSION,
    DEFAULT_SERVER_GTM_HMAC_KEY_ID,
  } = await import('../lib/analytics/server-gtm')
  const { ANALYTICS_PROVIDER_ADAPTERS, buildGa4MeasurementPayload } = await import('../lib/analytics/provider-adapters')
  const { isAnalyticsDeliveryPermanentlyIneligible } = await import('../lib/analytics/worker')
  const { isBrowserAnalyticsEventEnabled } = await import('../lib/analytics/browser-registry')
  const { ANALYTICS_MAX_DELIVERY_ATTEMPTS } = await import('../lib/analytics/delivery-ledger')

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

  assert.equal(canonicalCommerceEventSchema.safeParse(base).success, true)

  const oversized = { ...base, pagePath: 'x'.repeat(501) }
  assert.equal(canonicalCommerceEventSchema.safeParse(oversized).success, false)

  const privateQueryUrl = {
    ...base,
    pageUrl: 'https://example.test/product?email=private@example.com&token=secret#fragment',
  }
  assert.equal(sanitizeCommerceEvent(privateQueryUrl).pageUrl, 'https://example.test/product')

  const unknown = { ...base, unexpected: 'should be rejected' }
  assert.equal(canonicalCommerceEventSchema.safeParse(unknown).success, false)

  const sanitizedCommerce = sanitizeCommerceEvent({
    ...base,
    commerce: {
      transaction_id: 'ORDER-1',
      items: [{
        item_id: 'SKU-1',
        item_name: 'Demo phone',
        price: 1200,
        quantity: 1,
        phone: 'must-not-survive',
      }],
      unexpected_nested: { secret: 'must-not-survive' },
    },
  })
  const sanitizedItems = sanitizedCommerce.commerce?.['items']
  const sanitizedItem = Array.isArray(sanitizedItems)
    ? sanitizedItems[0] as Record<string, unknown>
    : {}
  assert.equal('phone' in sanitizedItem, false)
  assert.equal('unexpected_nested' in (sanitizedCommerce.commerce || {}), false)

  assert.equal(normalizeServerGtmEndpoint('https://gtm.example.com/'), 'https://gtm.example.com')
  assert.equal(isValidServerGtmEndpoint('http://gtm.example.com'), false)
  assert.equal(isValidServerGtmEndpoint('https://gtm.example.com/path?bad=1'), false)

  const envelope = buildServerGtmEnvelope(base, 'demo-store', 'preview')
  assert.equal(envelope.schema, 'demo-store.analytics.event')
  assert.equal(envelope.version, SERVER_GTM_CONTRACT_VERSION)
  assert.equal(envelope.project_key, 'demo-store')
  assert.equal(envelope.environment, 'preview')
  assert.equal(envelope.event.id, base.eventId)
  assert.equal(envelope.event.page_url, base.pageUrl)
  assert.deepEqual(envelope.event.metadata, base.metadata)

  process.env.SERVER_GTM_HMAC_SECRET = 'test-hmac-secret'
  delete process.env.SERVER_GTM_HMAC_KEY_ID
  const signedRequest = buildServerGtmRequest(base, 'demo-store', 'production')
  assert.equal(signedRequest.signed, true)
  assert.equal(signedRequest.keyId, DEFAULT_SERVER_GTM_HMAC_KEY_ID)
  assert.match(signedRequest.headers['x-phonerbazar-timestamp'], /^\d+$/)
  assert.match(signedRequest.headers['x-phonerbazar-signature'], /^[A-Za-z0-9_-]+$/)
  assert.equal(signedRequest.headers['x-phonerbazar-schema'], 'demo-store.analytics.event')
  assert.equal(signedRequest.headers['x-phonerbazar-version'], SERVER_GTM_CONTRACT_VERSION)
  assert.equal(signedRequest.headers['x-phonerbazar-event-id'], base.eventId)
  assert.equal(JSON.parse(signedRequest.body).event.id, base.eventId)

  const unsignedEnv = process.env.SERVER_GTM_HMAC_SECRET
  delete process.env.SERVER_GTM_HMAC_SECRET
  const unsignedRequest = buildServerGtmRequest(base, 'demo-store', 'production')
  assert.equal(unsignedRequest.signed, false)
  assert.equal(unsignedRequest.headers['x-phonerbazar-signature'], undefined)
  process.env.SERVER_GTM_HMAC_SECRET = unsignedEnv

  assert.equal(normalizeAnalyticsProjectKey(' Demo_Store '), 'demo_store')
  assert.equal(normalizeAnalyticsProjectKey('bad project!'), 'commerce')
  assert.equal(normalizeAnalyticsCurrency('bdt'), 'BDT')
  assert.equal(normalizeAnalyticsCurrency('BD'), 'USD')
  assert.equal(analyticsEventSchema('demo-store'), 'demo-store.analytics.event')

  const ga4Payload = buildGa4MeasurementPayload(base)
  const ga4EventParams = ga4Payload.events[0].params as Record<string, unknown>
  assert.match(ga4Payload.client_id, /^\d+\.\d+$/)
  assert.match(String(ga4EventParams.session_id), /^\d+$/)

  assert.equal(isLiveProviderDispatchAllowed(true), false)
  assert.equal(isLiveProviderDispatchAllowed(false), true)

  const adapterConfig = {
    projectKey: 'demo-store',
    currency: 'USD',
    enabled: true,
    marketingEnabled: true,
    consentMode: 'advanced' as const,
    debugMode: true,
    ga4MeasurementId: 'G-DEMO',
    gtmContainerId: 'GTM-DEMO',
    metaPixelId: '123',
    metaCapiEnabled: true,
    tiktokPixelId: 'TT-DEMO',
    tiktokEventsApiEnabled: true,
    serverGtmEnabled: true,
    serverGtmEndpoint: 'https://gtm.example.com',
    environment: 'production' as const,
    eventControls: {},
  }

  process.env.SERVER_GTM_HMAC_SECRET = 'test-hmac-secret'
  for (const provider of ['GA4', 'META_CAPI', 'TIKTOK_EVENTS_API', 'SERVER_GTM'] as const) {
    assert.ok(ANALYTICS_PROVIDER_ADAPTERS[provider])
    assert.equal(
      ANALYTICS_PROVIDER_ADAPTERS[provider].canDispatch({ ...base, testMode: true }, adapterConfig),
      false,
    )
  }
  assert.equal(ANALYTICS_PROVIDER_ADAPTERS.SERVER_GTM.canDispatch(base, adapterConfig), true)
  delete process.env.SERVER_GTM_HMAC_SECRET
  assert.equal(ANALYTICS_PROVIDER_ADAPTERS.SERVER_GTM.canDispatch(base, adapterConfig), false)

  // Defense-in-depth worker guard: an invalid event/provider pair must be permanently ineligible.
  process.env.SERVER_GTM_HMAC_SECRET = 'test-hmac-secret'
  assert.equal(
    isAnalyticsDeliveryPermanentlyIneligible(
      base,
      'SERVER_GTM',
      adapterConfig,
    ),
    true,
  )

  // Safe test events are never treated as live provider deliveries.
  assert.equal(
    isAnalyticsDeliveryPermanentlyIneligible(
      { ...base, testMode: true },
      'GA4',
      adapterConfig,
    ),
    true,
  )

  // Missing consent is permanently ineligible; a configured but disabled optional event is too.
  assert.equal(
    isAnalyticsDeliveryPermanentlyIneligible(
      { ...base, consent: { necessary: true, analytics: false, marketing: false } },
      'GA4',
      adapterConfig,
    ),
    true,
  )
  assert.equal(
    isAnalyticsDeliveryPermanentlyIneligible(
      base,
      'GA4',
      { ...adapterConfig, eventControls: { add_to_cart: false } },
    ),
    true,
  )

  const browserConfig = { ...adapterConfig, eventControls: { add_to_cart: true, purchase: true } }
  assert.equal(isBrowserAnalyticsEventEnabled('add_to_cart', browserConfig), true)
  assert.equal(isBrowserAnalyticsEventEnabled('add_to_cart', { ...browserConfig, eventControls: { add_to_cart: false } }), false)
  assert.equal(isBrowserAnalyticsEventEnabled('purchase', { ...browserConfig, eventControls: { purchase: false } }), true)

  assert.equal(ANALYTICS_MAX_DELIVERY_ATTEMPTS, 8)

  console.log('analytics contract tests passed')
  console.log('analytics worker eligibility guards passed')
  console.log('live provider dispatch policy tests passed')
  console.log('provider adapter registry tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
