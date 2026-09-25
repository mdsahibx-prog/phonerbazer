# Portable Analytics Mapping

## Project-neutral contract

| Admin value | Purpose | Runtime consumer |
|---|---|---|
| Analytics enabled | Master analytics switch | Canonical event dispatcher |
| Marketing enabled | Marketing consent gate | Marketing destinations |
| GA4 Measurement ID | Google destination identity | Web GTM / server adapters |
| GTM Container ID | Web container identity | GTM bootstrap |
| Meta Pixel ID | Meta destination identity | Meta adapter |
| Meta CAPI enabled | Server Meta switch | Meta adapter |
| Server GTM enabled | Server container switch | Server GTM adapter |
| Server GTM endpoint | Deployed server container URL | Server GTM transport |
| Consent mode | Privacy behavior | Browser/server adapters |
| Event controls | Per-event feature flags | Canonical dispatcher |

## One-time Google Tag Manager setup

The Web GTM container must contain a Google tag using the project's GA4 Tag ID. For server-side routing, the Google tag configuration should use the `server_container_url` parameter pointing at the deployed server container. Google documents this as the supported web-to-server routing mechanism.

After that one-time container template is imported into another project, the project-specific IDs/URL can be changed through the Admin configuration and the same application contract remains portable.

## Operational states

- DISABLED: no provider configuration is active.
- PARTIAL: identity is configured but required server credentials are missing.
- CONFIGURED: Admin configuration is complete enough to attempt delivery.
- REACHABLE: public Web GTM container responds.
- PAUSED: Server GTM endpoint exists but its runtime switch is off.

`CONFIGURED` is not the same as `VERIFIED`. External Google Tag Manager publication and destination validation must still be completed.

## Non-negotiable boundary

Analytics configuration must never become a dependency for order creation, stock reservation, payment confirmation, courier booking, invoice generation, authentication, or checkout success.
