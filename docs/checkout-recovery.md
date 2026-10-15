# Checkout Recovery Engine

## Behavior and safeguards

- Draft autosave is debounced in Buy Now, cart checkout, and Landing Page Order; draft-save errors do not block normal checkout.
- Landing Page Order uses the same risk-aware guest-order action as the standard guest checkout, including the existing COD/advance-payment decision, order idempotency, inventory validation, and canonical purchase-event flow. The source is preserved as `LANDING_PAGE` in the existing `checkout_sessions` row and commerce-event metadata.
- Product, variant, price and stock snapshot fields are re-read server-side. Cart item membership and quantities are read from the server-side cart cookie, not trusted from the browser.
- A random per-checkout capability is held in `sessionStorage` and only its SHA-256 hash is stored in `checkout_sessions`. It is not sent to analytics.
- Recovery contact is a separate optional consent from analytics/marketing consent. Unchecking after granting consent records a withdrawal timestamp.
- Recovery is manual WhatsApp only. The system records that the WhatsApp link was opened, not that a message was delivered.
- Sessions with any linked order, payment/order transition, withdrawn consent, expired session or two contact attempts are ineligible for outreach. A draft never reserves stock.
- Existing order idempotency, risk assessment, COD, advance payment and purchase-event flow are not replaced. Recovered-order linkage is based on the existing checkout request ID when the order lifecycle updates the session.

## Scheduler setup

Vercel Cron is configured in `vercel.json` for `/api/cron/checkout-recovery` once daily at 08:00 UTC. The current Vercel Hobby plan rejects schedules more frequent than daily; this is eventual recovery processing, not near-real-time. Do not upgrade the plan as part of this change. If near-real-time processing becomes a requirement, choose an already-approved scheduler or separately approve the required hosting plan before changing the schedule. Before enabling it in any environment, configure a high-entropy `CRON_SECRET` environment variable in that environment. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; requests without a matching bearer token return `401`. Do not commit the value or use a production secret in Preview. Preview needs its own secret if the scheduled route is to be exercised there.

The worker processes at most 100 sessions per run, uses a conditional status update to avoid duplicate abandonment events, derives saved delivery charges from server settings, and never creates orders or reserves stock. It only changes inactivity state and emits the canonical `CHECKOUT_ABANDONED` event.

## Database

Apply `supabase/migrations/20261015090000_checkout_recovery_engine.sql` through the established migration process after verifying the target database. The migration is additive and extends the existing `checkout_sessions` model; it does not create a second checkout-session table. It adds recovery history with admin-only RLS and service-role-only grants.

## Admin workflow

Open Admin → Checkout Recovery. Filter and search the bounded list. WhatsApp is offered only for abandoned, unexpired sessions with active recovery consent, no linked order, and fewer than two recorded attempts. The generated message is a generic help offer and contains no checkout token. Clicking the button records a link-open attempt; staff must not interpret that as delivery confirmation. Staff can record `Not interested` or `Close`. Do not contact customers outside this manual, consent-gated action.

## Verification

1. Run `pnpm test`, `pnpm exec eslint app/api/cron/checkout-recovery/route.ts 'app/admin/(operations)/checkout-recovery/page.tsx' components/admin/checkout-recovery-manager.tsx components/order/checkout-flow.tsx components/order/cart-checkout-flow.tsx lib/commerce/checkout-recovery-actions.ts scripts/checkout-recovery-policy-test.ts`, and `pnpm exec tsc --noEmit`.
2. In a non-production environment with the additive migration applied, test Buy Now, cart checkout, and Landing Page Order autosave, tab refresh, consent grant/withdrawal, and save failures.
3. Confirm Landing Page Order and standard guest checkout share the same risk-aware order action; test COD and advance-payment routing without creating real customer orders.
4. Call the cron route without a bearer token and confirm `401`; with a non-production `CRON_SECRET`, confirm bounded processing and idempotent repeated runs.
5. Confirm any existing order (including payment-pending), completed, expired, withdrawn-consent and contact-limit cases never offer WhatsApp.
6. Confirm WhatsApp opening does not claim delivery and no recovery token/contact/address reaches analytics.
7. Verify stock reservation/release, idempotent order retry, fraud/risk behavior and canonical purchase event behavior before any production release.

## Limitations / release gate

This branch has not been deployed and no live database was accessed. The migration must be applied to the intended non-production database first. Configure `CRON_SECRET` separately in Preview and Production before enabling the scheduled worker. Do not send real customer messages as part of testing.
