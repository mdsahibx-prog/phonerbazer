# Analytics Event Mapping v2

## Purpose
Provider-neutral mapping contract for the Analytics Control Center. Canonical event names are the application contract; provider-specific names/payloads belong in adapters. Commerce systems remain authoritative.

## Mapping layers
```
Commerce / Storefront -> Canonical Event Contract -> durable event log
                                            -> Web dataLayer / GTM
                                            -> GA4 adapter
                                            -> Meta Pixel / CAPI adapter
                                            -> Server GTM adapter
```
Analytics must never decide price, stock, payment, order state, fulfillment, or checkout success.

## Canonical event mapping

| Canonical | Category | Required | GA4 | GTM | Meta Pixel | Meta CAPI | Server GTM |
|---|---|---:|---|---|---|---|---|
| page_view | page | No | page_view | page_view | PageView | Optional | Yes |
| view_item | catalogue | No | view_item | view_item | ViewContent | Optional | Yes |
| view_item_list | catalogue | No | view_item_list | view_item_list | — | — | Yes |
| search | search | No | search | search | Search | Optional | Yes |
| add_to_cart | cart | No | add_to_cart | add_to_cart | AddToCart | Optional | Yes |
| remove_from_cart | cart | No | remove_from_cart | remove_from_cart | — | — | Yes |
| view_cart | cart | No | view_cart | view_cart | — | — | Yes |
| begin_checkout | checkout | No | begin_checkout | begin_checkout | InitiateCheckout | Optional | Yes |
| add_shipping_info | checkout | No | add_shipping_info | add_shipping_info | — | — | Yes |
| add_payment_info | checkout | No | add_payment_info | add_payment_info | — | — | Yes |
| purchase | purchase | **Yes** | purchase | purchase | Purchase | Optional | Yes |
| refund | purchase | No | refund | refund | — | Optional | Yes |
| generate_lead | lead | No | generate_lead | generate_lead | Lead | Lead | Yes |
| contact | support | No | contact | contact | Contact | Contact | Yes |
| support_request | support | No | support_request | support_request | — | — | Yes |
| login | support | No | login | login | — | — | Yes |
| sign_up | support | No | sign_up | sign_up | CompleteRegistration | Optional | Yes |
| whatsapp_click | support | No | whatsapp_click | whatsapp_click | Contact | Optional | Yes |
| checkout_abandoned | recovery | No | checkout_abandoned | checkout_abandoned | — | — | Yes |
| checkout_recovered | recovery | No | checkout_recovered | checkout_recovered | — | — | Yes |
| RISK_ASSESSED | diagnostic | **Yes** | — | RISK_ASSESSED | — | — | Yes |

Server GTM “Yes” means the event is eligible for the canonical server envelope; it does not mean Server GTM is enabled in production.

## Internal commerce lifecycle mapping

| Internal event | Canonical interpretation | Rule |
|---|---|---|
| CART_CREATED | cart_created | Operational lifecycle |
| CART_ITEM_ADDED | add_to_cart | Only after server acceptance |
| CART_ITEM_UPDATED | cart_updated | Operational lifecycle |
| CART_ITEM_REMOVED | remove_from_cart | Keep DB mutation separate from customer event semantics |
| CHECKOUT_STARTED | begin_checkout | Shared by direct/cart checkout |
| CHECKOUT_QUOTED | checkout_progress | Quote is not order success |
| PAYMENT_INITIATED | add_payment_info / payment lifecycle | Never claim payment success |
| PAYMENT_VERIFIED | purchase only when authoritative order completes | Never infer from browser |
| PAYMENT_FAILED | checkout_error | Diagnostic/recovery |
| ORDER_COMPLETED | purchase | Server order is source of truth |
| ORDER_CANCELLED | order_cancelled | Operational lifecycle |
| ORDER_STATUS_CHANGED | order_status_changed | Operational lifecycle |
| SHIPMENT_CREATED | shipment_created | Operational lifecycle |
| SHIPMENT_TRACKED | shipment_tracked | Operational lifecycle |
| RETURN_REQUESTED | refund only after actual refund lifecycle | Request is not completed refund |
| RISK_ASSESSED | RISK_ASSESSED | Required diagnostic |

## Ecommerce payload mapping

| Canonical field | GA4 | Meta adapter | Rule |
|---|---|---|---|
| transaction_id | transaction_id | custom transaction data | Stable order/invoice identifier |
| value | value | value | Server-authoritative for purchase |
| currency | currency | currency | BDT currently |
| shipping | shipping | custom data if needed | Authoritative quote/order |
| items | ecommerce items | contents | Transform in adapter |
| item_id | item_id | content_ids | Public product identifier only |
| item_name | item_name | content metadata | Public catalogue data |
| item_brand | item_brand | content metadata | Public catalogue data |
| item_category | item_category | content metadata | Public catalogue data |
| price | price | item_price adapter field | Adapter-owned naming |
| quantity | quantity | quantity | Positive integer |
| search_term | search_term | search_string adapter field | Never PII |

## Consent mapping

| Canonical consent | Google/GTM | Meta |
|---|---|---|
| necessary=true | functionality/security available | Does not grant marketing |
| analytics=true | analytics_storage=granted | Does not itself grant marketing |
| marketing=true | ad_storage/ad_user_data/ad_personalization=granted | Marketing destination may process subject to configuration |

Optional destinations must evaluate consent before dispatch.

## Identity and deduplication

- eventId is the canonical event identity.
- purchase uses a stable server-derived identity such as purchase:<orderId>.
- Browser/CAPI Meta events should share event identity when both are active.
- GA4 receives event_id as an event parameter; transaction identity remains separate.
- Server GTM receives the sanitized canonical envelope.
- Never put phone, email, address, payment credentials, authorization headers, cookies, raw IP, or secrets in the canonical payload.

## Admin-to-runtime mapping

| Admin field | Runtime responsibility |
|---|---|
| Analytics enabled | Master canonical dispatch switch |
| Marketing tracking enabled | Marketing destination gate |
| GA4 Measurement ID | GA4 destination identity |
| GTM Container ID | Web GTM bootstrap identity |
| Meta Pixel ID | Browser Meta destination identity |
| Meta CAPI enabled | Server Meta adapter switch |
| Server GTM enabled | Server GTM adapter switch |
| Server GTM endpoint | Opaque server-container ingress |
| Consent mode | Consent policy |
| Debug mode | Diagnostics/development behavior |
| Event controls | Per-event feature flags |

Secrets remain environment-managed and are never returned to the browser.

## Verification contract

Configured != healthy. The control center should distinguish:
1. Configured — identity exists.
2. Reachable — external endpoint responds.
3. Runtime detected — browser/container executes.
4. Event observed — canonical event emitted.
5. Destination verified — provider receives expected event.
6. Production healthy — required checks pass without commerce regression.

## Server-side GTM boundary

Google documents server-side tagging as a web container plus a separate server container. A Google tag can use the `server_container_url` configuration parameter to route events to the tagging server. The application adapter therefore remains disabled until a real server container URL and compatible server-container client/tag configuration exist.

## Portability rules

1. Keep canonical event names/schema.
2. Keep provider adapters separate from commerce logic.
3. Change IDs/endpoints through Admin settings.
4. Change only adapters when provider semantics differ.
5. Never copy project secrets or customer fields.
6. Verify destinations independently before enabling.

This document is a mapping contract, not a claim that every listed destination is currently enabled or verified.
