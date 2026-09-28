# Portable Analytics Architecture

PhonerBazar's analytics layer is a provider-neutral adapter system. The canonical commerce event contract is the only interface storefront code should depend on; GA4, GTM, Meta, TikTok, and server-side GTM are replaceable destinations.

## Non-negotiable boundary

Commerce/order/payment/stock/courier systems are authoritative. Analytics is best-effort and must never decide price, stock, payment, order state, fulfillment, or customer access.

If every analytics provider is disabled, unreachable, blocked by consent, or misconfigured, checkout and ordering must still work.

## Architecture

```
Storefront / Checkout / Server actions
                |
                v
       Canonical Event Contract
          /              \
         v                v
 Durable event log     Browser adapters
    (Supabase)        GTM / GA4 / Meta / TikTok
         |
         v
   Server dispatcher
     /    |      \
   GA4   Meta   TikTok   Server GTM
```

## Canonical contract

Each event carries:

- `eventId` — stable deduplication key
- `eventName` — from `lib/analytics/types.ts`
- `eventVersion`
- timestamp
- session/anonymous identifiers
- page/referrer/UTM attribution
- device context
- consent state
- optional ecommerce payload
- safe metadata
- optional test mode

`/api/analytics` validates the contract, enforces a 48 KB payload limit, sanitizes persisted fields, deduplicates by event ID, and only then queues provider delivery.

## Event governance

`lib/analytics/registry.ts` is the source of truth for admin event controls and destination declarations.

`lib/analytics/provider-maps.ts` is the source of truth for provider-specific event names. Do not put vendor event names into storefront components.

Current mappings include:

| Canonical | Meta Pixel | TikTok Pixel | TikTok Events API |
|---|---|---|---|
| `view_item` | ViewContent | ViewContent | ViewContent |
| `search` | Search | Search | Search |
| `add_to_cart` | AddToCart | AddToCart | AddToCart |
| `begin_checkout` | InitiateCheckout | InitiateCheckout | InitiateCheckout |
| `purchase` | Purchase | CompletePayment | CompletePayment |
| `generate_lead` | Lead | SubmitForm | SubmitForm |
| `contact` | Contact | Contact | Contact |
| `sign_up` | CompleteRegistration | CompleteRegistration | CompleteRegistration |

TikTok `page_view` is intentionally browser-only and uses the SDK page call. It is not sent through TikTok Events API.

## Deduplication

Browser events use a generated UUID. The API stores that event ID once. Retries with the same event ID are acknowledged as already recorded and are **not dispatched again**.

Authoritative purchases use `purchase:<orderId>` and are emitted from server order completion logic. Client purchase events must never be treated as proof that an order exists.

## Consent

Necessary commerce functionality is independent from analytics/marketing consent.

- `analytics=true` permits analytics destinations such as GA4.
- `marketing=true` permits marketing destinations such as Meta/TikTok.
- both false means no optional provider delivery.
- synthetic admin tests are stored as test events and do not send live provider traffic.

## Client delivery

The browser uses `navigator.sendBeacon` when available, with a `fetch(..., keepalive)` fallback. This makes navigation-away delivery more reliable without blocking checkout UI.

GTM dataLayer events are emitted from the same canonical event. Provider SDKs are initialized lazily and only when their consent/configuration requirements are satisfied.

## Server delivery

Server delivery is isolated in `lib/analytics/server.ts`:

- GA4 Measurement Protocol
- Meta Conversions API
- TikTok Events API
- opaque server-side GTM ingress

External requests have bounded timeouts and a retry for transient failures. Delivery failures are never thrown into commerce actions.

Credentials remain environment secrets:

- `GA4_API_SECRET`
- `META_CAPI_ACCESS_TOKEN`
- `TIKTOK_EVENTS_API_ACCESS_TOKEN`

Provider IDs and non-secret configuration are stored through the admin settings layer.

## Server-side GTM portability

`lib/analytics/server-gtm.ts` treats the server container URL as an opaque ingress. Provider-specific routing belongs inside the server-side GTM container, not inside commerce code.

The application does not claim server-side GTM is active merely because an endpoint is entered. The endpoint must be deployed, reachable, and configured to route the canonical envelope.

## Reusing this in another project

1. Copy `lib/analytics/types.ts`, `registry.ts`, `provider-maps.ts`, `events.ts`, `client.ts`, `server.ts`, and `server-gtm.ts`.
2. Copy `app/api/analytics/route.ts` or adapt it to the next framework's request handler.
3. Replace only the persistence adapter in `events.ts` if the next project does not use Supabase.
4. Keep the canonical event contract stable.
5. Keep vendor mappings in `provider-maps.ts`.
6. Keep provider secrets server-only.
7. Connect the next project's admin settings to the same configuration shape.
8. Add provider-specific SDKs only inside the adapter layer.
9. Add the event calls at business milestones, not inside provider code.
10. Run the migration checklist below before enabling production delivery.

No product price, stock rule, checkout rule, customer credential, provider secret, or project-specific database ID belongs in the portable analytics layer.

## Production completion checklist

### Code
- [x] Canonical event schema and sanitization
- [x] Provider-neutral mapping module
- [x] Admin registry and event controls
- [x] Browser + server adapters
- [x] API payload limits and validation
- [x] Event-ID deduplication before provider dispatch
- [x] Non-blocking browser delivery
- [x] Synthetic test mode
- [x] Purchase emitted from authoritative server order completion

### Project wiring
- [x] Product view
- [x] Product variant selection
- [x] Add to cart after successful server action
- [x] Cart view/update/remove
- [x] Begin checkout from cart and Buy Now
- [x] Purchase from authoritative order completion

### Still required per deployment
- [ ] Verify Vercel production environment secrets exist (values must never be committed)
- [ ] Verify GA4 Measurement Protocol is receiving events
- [ ] Verify Meta Pixel/CAPI event delivery and event IDs
- [ ] Verify TikTok Pixel and Events API delivery
- [ ] If Server GTM is enabled, verify the actual server container and routing
- [ ] Run a browser end-to-end smoke test without creating a real customer order
- [ ] Confirm consent-denied mode produces no optional provider delivery
- [ ] Confirm analytics failures never alter checkout/order results

## Safe smoke-test sequence

1. Open a product page.
2. Confirm one canonical `view_item`.
3. Select a variant and confirm `select_item`.
4. Add to cart and confirm `add_to_cart` only after the server action succeeds.
5. Open cart and confirm `view_cart`.
6. Start Buy Now or cart checkout and confirm `begin_checkout`.
7. Do not create a real customer order for diagnostics; use Admin synthetic tests for provider-independent persistence checks.
8. For production purchase verification, use the project's approved internal test-order procedure and verify the authoritative server event ID.

## Future extensions

Keep future features as adapters around the canonical contract:

- retry queue / dead-letter replay
- event retention policy
- warehouse export
- attribution reporting
- event sampling
- additional providers
- schema version 2
- funnel dashboards

The portable boundary should not change when a new provider is added.
