# One-step landing-page checkout contract

This checkout is a compact entry point into the existing guest-order lifecycle, not a second order system.

## Quote and order authority

- `quoteDeliveryZones` loads the selected product/variant from the server and returns authoritative item totals plus both configured delivery-zone charges in one request.
- The browser uses that quote for display only. `createGuestOrderWithRisk` revalidates current price, stock, risk, and delivery on submit. `expectedGrandTotal` is a stale-quote guard, not a trusted price; a changed total is returned to the client and requires another customer confirmation.
- Keep one `checkoutRequestId` for the form instance/retries. Reuse `createGuestOrderWithRisk` so the existing COD RPC, risk-based payment/manual review, idempotency, order artifacts, notifications, and purchase tracking remain in the canonical pipeline. Do not call a separate landing-only order RPC.

## Shared customer experience

- Product checkout and landing checkout share the canonical division/district list, searchable selection, and Bangladesh phone normalization.
- Analytics/marketing consent is read from the existing client consent helper and passed into the canonical order action; do not bypass the shared event pipeline.
- Successful order summaries use the existing `sahigatget-last-order` session key and `/order/success` route. A payment-required result follows the payment provider redirect.
- Returning-customer prefill uses the versioned `phonerbazar-customer-prefill-v1` localStorage key and only the name, phone, division, district, area, and street-address fields. Do not persist email, payment information, order history, or secrets there.
- The order section uses a lightweight skeleton, then preloads the one-step form before it enters the viewport; customers should not need a separate “start order” click to see the fields.

## Regression guardrails

- Keep the landing form one-step, mobile-safe, and keyboard accessible; price/stock failures must not create a new order.
- Do not introduce migrations, schema/RPC signature changes, RLS changes, new secrets, a second checkout/order lifecycle, or real customer orders for testing.
- Run `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm lint`. Run `pnpm build` in a configured environment that has the required public Supabase build variables; no secrets should be committed to the repository.
