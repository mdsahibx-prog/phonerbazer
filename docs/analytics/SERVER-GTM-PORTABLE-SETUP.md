# Portable Server-side GTM Contract

## Purpose

This integration makes Server-side GTM an optional, provider-neutral transport behind the canonical analytics layer. Storefront, cart, checkout, order, payment, stock, and courier logic remain independent of the provider.

Google documents server-side GTM as a two-container model: a Web container and a Server container running in a cloud environment. The Server container accepts incoming requests through a Client, processes the event, then dispatches vendor-specific requests. https://support.google.com/tagmanager/answer/13387731

## Current Phonerbazar state

- Web GTM container: `GTM-T3QQN9RR`
- Server GA4 delivery: already active
- Durable analytics delivery ledger + retry worker: active
- `SERVER_GTM` adapter: implemented
- Server GTM endpoint: intentionally empty
- Server GTM activation: intentionally off

Do not enable Server GTM until its server container, ingress endpoint, Client, and destination tags have been verified.

## Contract

The app sends:

- HTTP method: POST
- Content-Type: application/json
- Version: `1.0`
- Canonical schema: `<project_key>.analytics.event`
- HMAC authentication headers
- A sanitized provider-neutral event envelope

Important headers:

| Header | Purpose |
| --- | --- |
| `x-phonerbazar-signature` | HMAC-SHA256 signature of `<timestamp>.<raw_body>` |
| `x-phonerbazar-timestamp` | Unix timestamp in seconds |
| `x-phonerbazar-key-id` | HMAC key identifier, default `v1` |
| `x-phonerbazar-schema` | Canonical schema name |
| `x-phonerbazar-version` | Contract version |
| `x-phonerbazar-event-id` | Canonical event identifier |

The app signs the exact JSON request body. HTTPS is mandatory.

## Deployment secrets

Set these as Vercel production environment variables before enabling the provider:

```text
SERVER_GTM_HMAC_SECRET=<high-entropy secret>
SERVER_GTM_HMAC_KEY_ID=v1
```

Generate a new secret locally; never put it in Git, Supabase settings, the Admin UI, screenshots, or chat.

Example:

```bash
openssl rand -hex 32
```

The same key must be made available to the Server GTM container as an HMAC credential. Google documents the Server GTM `hmacSha256` API and its `SGTM_CREDENTIALS` key format. https://developers.google.com/tag-platform/tag-manager/server-side/api

For example, if the chosen secret is stored in the `SERVER_GTM_HMAC_SECRET` environment variable as a literal string, the corresponding Server GTM credential value must be the Base64 encoding of that same string bytes:

```bash
printf %s "$SERVER_GTM_HMAC_SECRET" | base64 -w0
```

Use that Base64 value under the matching key ID in the Server GTM credential file:

```json
{
  "keys": {
    "v1": "<base64-of-the-same-secret>"
  }
}
```

Do not paste the secret itself into this document.

## Server container

Create a separate Google Tag Manager container:

```text
Name: PhonerBazar Server
Target platform: Server
Workspace: Default Workspace
```

Keep the existing Web container `www.phonerbazar.store / GTM-T3QQN9RR` unchanged.

Google's current setup supports Server as a distinct container type. https://support.google.com/tagmanager/answer/14842164

Provision a tagging server. Google supports managed/server-container deployment workflows and documents Cloud Run-based server-side tagging. https://developers.google.com/tag-platform/tag-manager/server-side/manual-setup-guide

The resulting HTTPS tagging-server URL is the value that will eventually go into:

```text
Admin → Analytics Control Center
Server-side GTM endpoint
```

Do not paste the URL into the Admin UI yet.

## Custom Client

Because Phonerbazar sends a provider-neutral JSON envelope rather than Google Analytics Measurement Protocol, the Server container must have a Client that recognizes the request, validates it, claims it, and converts it into Server GTM event data.

Google requires a Client to claim an incoming request before running the container. The Server GTM APIs expose request body, headers, request method/path, HMAC-SHA256, JSON parsing, `claimRequest`, `runContainer`, and `returnResponse` for custom Clients. https://developers.google.com/tag-platform/tag-manager/server-side/api

Recommended Client matching rules:

1. Method must be `POST`.
2. Request path must match the dedicated ingress path chosen for Phonerbazar.
3. `x-phonerbazar-version` must equal `1.0`.
4. `x-phonerbazar-key-id` must be an allowed key ID.
5. Timestamp must be within five minutes of current server time.
6. Recompute HMAC-SHA256 over `<timestamp>.<raw_body>` using the configured key ID.
7. Reject invalid signatures with HTTP 401.
8. Parse JSON and require the expected schema and event fields.
9. Reject malformed or unsupported payloads with HTTP 400.
10. Claim the request and call `runContainer()` with normalized event data.
11. Return HTTP 200 after the container has accepted/processed the event.

A representative event passed to `runContainer` should expose:

```text
event_name
phonerbazar_event_id
phonerbazar_event_version
phonerbazar_schema
phonerbazar_project_key
phonerbazar_environment
phonerbazar_event
ecommerce
page_location
page_path
page_referrer
consent_analytics
consent_marketing
test_mode
```

Do not forward customer phone, email, address, passwords, authentication headers, payment credentials, or other PII through this contract. The app-side canonical sanitizer already removes/limits disallowed metadata and commerce keys.

## Server tags

Use Server GTM as the routing layer. Do not create parallel direct-to-vendor tags that duplicate the existing app server adapters unless the migration plan explicitly accounts for deduplication.

Recommended first destinations:

- GA4
- Meta
- TikTok

Start with GA4 only for the first verification pass.

The server-side GTM container should use the canonical event ID for deduplication wherever the destination supports it.

## Important GA4 deduplication rule

When Server GTM is enabled in Phonerbazar, the app's direct server GA4 adapter is suppressed by the application code. GA4 should therefore be delivered through Server GTM, not both paths.

Do not configure both paths independently for the same production event without testing; otherwise the same purchase can be delivered twice.

## Safe rollout

1. Create the Server container.
2. Provision its tagging server.
3. Record the HTTPS tagging-server URL.
4. Configure the Server GTM HMAC credential with the same secret/key ID as Vercel.
5. Create and test the Phonerbazar custom Client.
6. Verify the Client receives and claims a signed request.
7. Run a TEST event and ensure destination tags are blocked from live reporting when `test_mode=true`.
8. Configure GA4 server tag and verify one event in Server GTM Preview and GA4 validation/Realtime as applicable.
9. Only after verification, put the final endpoint into Phonerbazar Admin and enable Server GTM.
10. Save the Admin configuration.
11. Verify the Delivery Ledger reports `SERVER_GTM → SUCCEEDED`.
12. Verify `purchase` exactly once and check that existing order/checkout behavior is unchanged.
13. Add Meta/TikTok destinations one provider at a time and verify each independently.

## Admin behavior

The Admin save action intentionally rejects Server GTM activation when either:

- the endpoint is missing/invalid, or
- `SERVER_GTM_HMAC_SECRET` is not configured in the deployment.

This prevents a half-configured production state.

## Endpoint format

Valid:

```text
https://server-container.example.com
https://server-container.example.com/phonerbazar/collect
```

Invalid:

```text
http://...
https://...?... 
https://user:password@...
```

The current Admin validation intentionally rejects query strings, URL fragments, credentials, and non-HTTPS endpoints.

## First-party custom domain

After the Server container is proven stable on its managed URL, move to a first-party custom subdomain such as:

```text
https://sgtm.phonerbazar.store
```

Google documents first-party server-side setups as a way to keep site data/cookies in a first-party context and reduce direct browser communication with third parties. https://support.google.com/tagmanager/answer/13387731

Do not make the custom-domain migration part of the initial activation unless DNS and certificate ownership are already prepared.

## Non-negotiable production invariants

- Checkout must not depend on Server GTM.
- Order success must not depend on analytics success.
- Stock/payment/courier logic must remain untouched.
- Server GTM failures must only affect analytics delivery/retry state.
- Test events must never reach live provider reporting.
- Secrets must remain in deployment/container secret storage.
- The canonical event contract remains provider-neutral so the system can be reused by another storefront/project.
