# Portable Analytics Architecture

PhonerBazar's analytics layer is intentionally provider-neutral so the same architecture can be moved into another Next.js/Supabase project without coupling commerce logic to a vendor.

## Architecture

```
Storefront / Admin / Checkout
            |
            v
     Canonical Event Contract
            |
      +-----+-------------------+
      |                         |
      v                         v
  Durable event log        Client dataLayer
  (Supabase)                    |
      |                         v
      |                        GTM
      |                  /      |       \
      |                GA4     Meta    Future tags
      |
      +--> server dispatch
             |       |       |
            GA4     Meta    Server GTM
```

Commerce/order/payment/stock/courier systems remain authoritative. Analytics is best-effort and must never decide price, stock, payment, order state, or fulfillment.

## Provider-neutral contract

Every browser event uses:

- `eventId`
- `eventName`
- `eventVersion`
- `occurredAt`
- `sessionId`
- `anonymousId`
- page/referrer/attribution context
- device context
- consent state
- optional ecommerce payload
- optional safe metadata
- optional test mode

The contract is validated at `/api/analytics`, size-limited, sanitized before persistence, and de-duplicated by `event_id`.

## Event governance

The registry in `lib/analytics/registry.ts` is the source of truth for supported events.

Admin can disable optional events without changing storefront code. Required lifecycle events remain protected by the server.

Recommended ecommerce events follow Google's ecommerce model: `view_item`, `select_item`, `add_to_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, and `purchase`.

## Consent

GTM is bootstrapped from the document head and starts with denied optional storage. User choices are synchronized into the GTM data layer.

The browser container can be detected independently of optional analytics consent, while analytics/marketing dispatch remains consent-aware.

## GTM portability

The runtime configuration is stored as data rather than hardcoded:

- GTM container ID
- GA4 measurement ID
- Meta Pixel IDs
- server-side GTM endpoint
- environment
- debug mode
- consent mode
- per-event controls

The GTM web bootstrap and no-JavaScript fallback are generated from the current Admin configuration.

## Admin observability

The Analytics Control Center exposes:

- provider configuration state
- GTM external reachability
- recent canonical events
- full event registry
- required/optional event state
- provider destinations
- synthetic server-side test events
- consent configuration
- debug mode

Provider credentials are environment-managed secrets and are never returned to the browser.

## Reusing this system in another project

1. Copy `lib/analytics/`.
2. Keep the canonical event contract and registry.
3. Replace the Supabase adapter in `events.ts` if the next project uses another database.
4. Keep `client.ts` as the browser data-layer adapter.
5. Keep `server.ts` as the destination adapter layer.
6. Move the Admin control UI and server actions into that project's admin area.
7. Configure provider IDs through that project's settings store.
8. Preserve the rule that transactional systems are authoritative and analytics is best-effort.

No provider-specific ID, secret, order rule, product price, or customer credential is embedded in the portable layer.

## Security and privacy rules

Do not send phone, email, address, payment credentials, authorization headers, cookies, IP addresses, user-agent strings, or internal secrets as analytics metadata.

Purchase events use authoritative order data and stable transaction IDs. Client-side purchase events must not be trusted as proof of an order.

## Future extension points

The architecture intentionally leaves room for:

- server-side GTM
- additional ad/analytics providers
- event sampling
- consent categories
- event retention policies
- schema version 2
- event delivery retries
- dead-letter/replay tooling
- warehouse exports
- attribution and campaign reporting
- funnel dashboards

These extensions should remain adapters around the canonical event contract rather than introducing vendor-specific calls into commerce code.
