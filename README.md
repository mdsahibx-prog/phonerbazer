# Phonerbazar

Bangladesh-focused mobile phone and gadget ecommerce storefront.

## Technology

- Next.js App Router, React, TypeScript
- Supabase (PostgreSQL, Auth, Storage)
- Tailwind CSS, React Hook Form, Zod, Lucide
- Vercel deployment and scheduled jobs

## Core areas

- Public storefront: homepage, product catalogue/details, categories, brands, search and published landing pages
- Commerce: cart, Buy Now, guest checkout, order confirmation/tracking, payment and inventory workflows
- Administration: dashboard, products, orders, inventory, settings, analytics and checkout recovery
- Integrations: consent-aware analytics, commerce events, courier/payment integrations and scheduled recovery processing

## Local development

Requirements: Node.js 24 (matches current focused CI), pnpm 11.21.0, and a configured non-production Supabase project.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Configure environment variables using the team's secure environment-variable process. Never commit `.env` files, access tokens, service-role keys, payment secrets or cron secrets. Preview/development must use isolated non-production services and credentials.

## Quality checks

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

The repository's `pnpm test` script runs the analytics contract, direct-order payment, risk-category and checkout-recovery policy test scripts. Passing these checks does not replace database-backed integration tests or browser/end-to-end verification.

## Checkout recovery safeguards

Checkout recovery extends the existing `checkout_sessions` lifecycle; it must not create a second order or replace the canonical order/payment/inventory workflow. Drafts do not reserve stock. Recovery outreach is manual, consent-gated WhatsApp only, and an opened link is not proof of message delivery. The scheduled worker requires a high-entropy, environment-specific `CRON_SECRET`; never reuse a production secret in Preview.

See [Checkout Recovery Engine documentation](docs/checkout-recovery.md) and the [performance architecture audit](docs/performance/ARCHITECTURE.md) for additional constraints and verification steps.

## Release safety

- Do not run production migrations or change production environment settings without an explicitly approved release process.
- Test schema changes against an isolated non-production database first.
- Keep authorization and transaction-critical checks on the server.
- Do not use real customer data or contact customers during automated tests.
- Submit changes through a feature branch and pull request; do not push directly to `main`.
