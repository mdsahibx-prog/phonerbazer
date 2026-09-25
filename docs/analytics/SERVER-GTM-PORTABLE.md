# Portable Server-side GTM

## Purpose

PhonerBazar's analytics layer uses a canonical, provider-neutral event contract. Server-side GTM is an optional delivery boundary, not a dependency of checkout, orders, payments, stock, courier operations, or authentication.

## Architecture

Browser -> Web GTM -> Google Tag / destinations

Optional server path:

Canonical event -> Server GTM ingress -> GTM server container -> GA4 / Meta / Ads / future providers

The application never stores GA4 API secrets, Meta access tokens, or other provider credentials in the settings table.

## Admin values

- Analytics enabled
- GTM Container ID
- GA4 Measurement ID
- Server-side GTM enabled
- Server-side GTM endpoint

The endpoint must be the real HTTPS ingress of a deployed server-side GTM container. A placeholder URL must never be saved as an active endpoint.

## Portability contract

Only these project-specific values should normally change:

1. Web GTM container ID
2. GA4 Measurement ID
3. Meta Pixel ID
4. Server GTM endpoint

Provider secrets remain environment-level secrets.

## Activation sequence

1. Create a GTM server container.
2. Deploy its tagging server.
3. Give the tagging server a stable HTTPS endpoint/custom domain.
4. Configure the server container's GA4/Meta destinations.
5. Configure the Web GTM Google tag to use the server container URL where appropriate.
6. Enter the real endpoint in Admin.
7. Run Admin verification.
8. Test a non-transactional event.
9. Test ecommerce events and purchase deduplication.
10. Publish only after browser, server and destination verification.

## Safety

- Server GTM is optional.
- Provider failures must never fail commerce transactions.
- No raw credentials are accepted by the Admin endpoint field.
- HTTPS is mandatory.
- Endpoint URLs containing userinfo are rejected.
- Test events remain test events and must not be promoted to live commerce conversions.
- The application should not send arbitrary customer records to a configurable analytics endpoint.

## Future extension points

The canonical event can support additional destinations without changing storefront business logic:

- Google Ads
- Meta CAPI
- server-side GA4
- first-party warehouse
- BI/analytics export
- other privacy-reviewed providers

Each provider should have its own adapter, health state and retry policy.
