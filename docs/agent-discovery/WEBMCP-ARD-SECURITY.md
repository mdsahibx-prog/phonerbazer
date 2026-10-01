# WebMCP + ARD Security Boundary

## Public capabilities

PhonerBazar exposes only browser-facing capabilities that map to existing public UI and server validation:

- `search_catalogue` / `search_catalogue_mobile`: public catalogue search/navigation.
- `track_order`: read-only order-status lookup using the two values already required by the customer UI.
- `submit_support_request`: customer support form interaction. The action remains subject to the existing server-side validation and is intended to be reviewed by the user before submission.

## Deliberate exclusions

The following are not exposed as autonomous WebMCP tools:

- final order confirmation;
- stock reservation or release;
- checkout/payment execution;
- invoice generation;
- admin operations;
- authentication or credential management.

These operations either create consequential side effects or involve private/security-sensitive data.

## Security properties

- WebMCP is progressive enhancement; the ordinary HTML/React workflows remain the source of truth.
- No new API endpoint, service credential, database query, or secret is introduced for WebMCP.
- Tool schemas use explicit field names and parameter descriptions.
- Same-origin exposure is the default. No cross-origin `exposedTo` origins are configured.
- Agent-facing catalog resources contain public content only.
- Product price, stock, delivery, promotion, and policy information remains authoritative at the live application pages.
- ARD/ai-catalog manifests contain discovery metadata and public URLs only; they do not contain customer records or credentials.

## Change control

When copying this pattern to another project, update only public identity, URL, and capability metadata. Keep private commerce operations outside the agent-discovery layer unless a separate human-confirmation and authorization design has been reviewed.
