# Phonerbazar

Phonerbazar is a Bangladesh-focused mobile-phone e-commerce platform built with Next.js App Router, TypeScript, Supabase, and Vercel.

Production site: https://www.phonerbazar.store  
Repository: https://github.com/mdsahibx-prog/phonerbazer

## Stack

- Next.js App Router + React + TypeScript
- Supabase PostgreSQL, Auth, and Storage
- Tailwind CSS and Lucide React
- pnpm
- Vercel deployment

## Local development

Requirements: Node.js compatible with the project's Next.js version and pnpm 11.x.

```bash
git clone https://github.com/mdsahibx-prog/phonerbazer.git
cd phonerbazer
pnpm install
cp .env.example .env.local
# Fill in the values for a dedicated Supabase development project.
pnpm dev
```

Open http://localhost:3000.

## Environment and secrets

See `.env.example` for the core Supabase and site URL variables. Set environment variables separately for local development, Vercel Preview, and Vercel Production. Never copy production secrets into another project or commit secret values.

The application also has optional integrations and feature-specific configuration (including analytics/tracking). Audit each feature's environment-variable requirements and Admin settings before enabling it in a new deployment. Do not assume that a new Supabase project has the required schema, functions, policies, buckets, or seed/configuration data.

## Database portability checklist

Before deploying a copy to a new Supabase project:

1. Link the Supabase CLI to the **new** project and review migration status.
2. Apply all repository migrations to that project; do not point a copied app at the production database.
3. Verify RLS policies, grants, RPC/functions, triggers, indexes, and extensions.
4. Create and verify Storage buckets and their policies.
5. Create the required Auth configuration and OWNER/admin role bootstrap securely.
6. Load only the intended store configuration, categories, brands, products, and other seed data.
7. Configure the new project's URL/keys in local, Preview, and Production environments.
8. Test guest checkout, stock reservation, order creation, recovery, admin authorization, exports/invoices, and tracking with test data before going live.

## Commands

- `pnpm dev` — local development
- `pnpm lint` — ESLint
- `pnpm test` — repository contract/regression tests
- `pnpm build` — production build
- `pnpm performance:audit` — performance audit script

A successful build alone does not prove that a fresh Supabase project is fully provisioned or that checkout/admin flows work end-to-end.

## Security and business-critical invariants

- Keep service-role credentials server-only; never use them in client components or expose them through `NEXT_PUBLIC_*`.
- Keep price, discount, delivery charge, stock, order creation, and authorization decisions server-side.
- Do not disable RLS or bypass existing order/idempotency protections to make a copied project work.
- Use a separate Supabase project and separate Vercel environment values for every independent store/deployment.
