# Portable Analytics Mapping

## Goal

The analytics subsystem is designed to be moved between projects without changing commerce, checkout, payment, inventory, delivery, authentication, or order business logic. The project-specific values belong in the Admin Analytics configuration; provider credentials remain server environment secrets.

## Project-neutral configuration

| Admin value | Meaning | Used by |
|---|---|---|
| Analytics project key | Stable namespace for the project's analytics envelope and diagnostics | Core event/config layer |
| Currency code | ISO 4217 currency used for commerce events | Browser + GA4/Meta/TikTok adapters |
| Analytics enabled | Master analytics switch | Dispatcher |
| Marketing enabled | Marketing destination gate | Meta/TikTok adapters |
| GA4 Measurement ID | Web stream identity | Web GTM / GA4 server adapter |
| GTM Container ID | Web container identity | GTM bootstrap |
| Meta Pixel ID | Meta destination identity | Meta Pixel / CAPI |
| TikTok Pixel ID | TikTok destination identity | TikTok Pixel / Events API |
| Meta CAPI enabled | Server-side Meta switch | Meta adapter |
| TikTok Events API enabled | Server-side TikTok switch | TikTok adapter |
| Server GTM enabled | Server container switch | Server GTM adapter |
| Server GTM endpoint | Deployed server container ingress | Server GTM transport |
| Consent mode | Privacy behavior | Browser/server adapters |
| Event controls | Per-event switches | Canonical dispatcher |

### Recommended values for this project

- Project key: `phonerbazar`
- Currency: `BDT`
- GA4 Measurement ID: `G-084MMJNCTN`
- Web GTM Container ID: `GTM-T3QQN9RR`
- Meta Pixel IDs: configured in Admin
- TikTok Pixel ID: not currently configured
- Server GTM: currently disabled

A future project changes the project key, currency, destination IDs, and endpoint through its own Admin configuration. No provider secret belongs in these fields.

## Runtime portability boundary

The following are intentionally project-neutral:

- Canonical event names and schema version.
- Provider-specific mappings in `lib/analytics/provider-maps.ts`.
- Generic GTM runtime marker and script IDs.
- Server GTM envelope namespace, derived from the Admin project key.
- Generic browser event/consent signals.
- Consent and provider safety rules.
- Stable event-ID deduplication.
- Provider adapter registry and transport retry behavior.
- Durable delivery ledger records with safe admin replay.

The following are integration boundaries rather than provider configuration:
- Analytics persistence adapter (Supabase is the current concrete implementation).

- Supabase persistence adapter and the `commerce_events` table.
- Existing commerce milestone call sites that decide when `view_item`, `add_to_cart`, `begin_checkout`, and authoritative `purchase` occur.
- The project's authenticated Admin shell.

This keeps the analytics core reusable while allowing a different persistence implementation when a future project uses a different backend.

## One-time Google Tag Manager setup

The Web GTM container must contain the Google tag and the project's GA4 destination configuration. For server-side routing, configure the web Google tag with the deployed server-container URL where the selected architecture requires it. Keep provider routing inside GTM rather than in checkout or commerce code.

Google's GA4 Measurement Protocol requires HTTPS POSTs, a web-stream `measurement_id`, a server-only `api_secret`, and a `client_id` for web streams. It also documents `session_id` and `engagement_time_msec` for relevant reporting use cases. Validate payload structure against the Measurement Protocol validation endpoint before production. The current server adapter keeps the API secret server-only and uses the web-stream measurement ID/client ID contract documented by Google.

## Provider deduplication

The canonical `eventId` is the cross-destination deduplication identifier.

For TikTok, when the same event is sent through Pixel and Events API, the identical `event_id` must be passed through both paths so TikTok can deduplicate the conversion.

For Meta CAPI and other providers, preserve the canonical event ID and map it to the provider's documented event identifier when both browser and server copies overlap.

## Secrets and backend security

Provider secrets stay in server-only environment variables. Supabase secret/service-role access is server-side only and must not be exposed to browser code; RLS still remains the database authorization boundary.

Vercel supports separate environment-variable scopes for Production, Preview, and Development; use those scopes to prevent preview configuration from inheriting production secrets accidentally.

## Future-project onboarding

1. Copy the analytics core and its integration adapter.
2. Apply the same `commerce_events` persistence contract or provide another persistence adapter.
3. Open Admin → Analytics Control Center.
4. Set the project key and currency.
5. Set GA4/GTM/Meta/TikTok IDs as applicable.
6. Keep server credentials in the new project's environment.
7. Verify provider reachability.
8. Run synthetic tests.
9. Run browser ecommerce smoke tests.
10. Review the delivery ledger and replay any failed provider delivery only after the provider is eligible again.
11. Publish only after consent, deduplication, and provider-receipt verification.

The target operating model is **configuration-first reuse**: values change in Admin; commerce code does not.

## Non-negotiable rules

Analytics configuration must never become a dependency for:

- order creation
- stock reservation
- payment confirmation
- courier booking
- invoice generation
- authentication
- checkout success

If every analytics destination is disabled, unavailable, or blocked by consent, commerce must continue normally.
