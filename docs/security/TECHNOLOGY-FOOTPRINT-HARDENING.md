# Infrastructure Endpoint Masking and Security

## What the code now does

- Browser-side Supabase Auth requests use the same-origin **/_gateway** path instead of embedding the project's Supabase hostname in the browser client.
- A second same-origin **/_media** path handles existing media URLs saved from the legacy Supabase project. Set **SUPABASE_LEGACY_URL** if that legacy project's domain ever changes.
- Server Supabase clients rewrite backend URLs in JSON reads and writes before values can be serialized into page HTML, React Server Component payloads, or server-action responses.
- New brand, category, product, banner, and landing-page uploads return/use first-party URLs.
- Browser CSP no longer allowlists the Supabase hostname. The gateway rewrites live upstream to the server-configured Supabase URL.
- Browser sessions continue to use the generic **_pb_sess** storage/cookie name with a compatibility migration for old browser keys.

The public publishable/anon key can still be visible in browser code by design. It is not a database password. Supabase expects the Data API to be protected by least-privilege grants, Row Level Security (RLS), and Auth; the service-role/secret key must remain server-only. Hiding the URL is defense-in-depth, not an authorization boundary.

## Vercel domain exposure

The Vercel project currently has SSO protection enabled for generated deployment URLs, excluding custom domains. Keep this setting enabled so generated vercel.app deployment URLs are not a public bypass around the custom domain.

The production custom domain still responds from Vercel directly unless Cloudflare is actually proxying it. To prevent a technology profiler from seeing **Server: Vercel** and Vercel diagnostic headers:

1. In Cloudflare DNS, proxy the **www** and apex records through Cloudflare (orange cloud). Confirm the DNS target and SSL/TLS mode are correct before saving.
2. Under **Rules → Transform Rules → Response Header Transform Rules**, add a rule for **www.phonerbazar.store** and **phonerbazar.store**.
3. Remove these response headers: **x-vercel-id**, **x-vercel-cache**, **x-matched-path**, **x-nextjs-prerender**, and **x-nextjs-stale-time**.
4. Deploy the rules and verify the public custom domain. Cloudflare does not allow a Response Header Transform Rule to edit the **Server** header; with proxying enabled, verify that the returned server header is Cloudflare rather than Vercel.
5. Test the custom domain, not only a Vercel deployment URL. Do not disable deployment protection just to test the origin.

If Cloudflare is not currently the authoritative DNS/proxy for these records, this step requires dashboard/DNS changes and cannot be accomplished by a Next.js code change alone.

## Supabase security checks

The current Supabase Security Advisor reports:

- **Warning: leaked-password protection is disabled.** Enable it in **Supabase Dashboard → Authentication → Settings → Password Security → Leaked password protection**. This helps block known compromised passwords.
- Four tables have RLS enabled with no policies: **analytics_delivery_ledger**, **analytics_worker_auth**, **inventory_cost_balances**, and **inventory_receipts**. No policies means access through RLS is denied by default. These appear to be internal tables, so do not add broad policies; verify they have no unintended anon or authenticated grants.

Never expose **SUPABASE_SERVICE_ROLE_KEY** in browser code. Keep all sensitive tables protected by explicit grants and RLS, and validate every payment/webhook/admin mutation server-side. Anyone who knows a Supabase hostname can still attempt requests to it; the actual protection must come from database authorization, secret handling, validation, and rate limits.

## Verification checklist

- [ ] Run lint, typecheck, production build, and existing checkout/auth contract tests.
- [ ] Verify homepage, product list, cart, product detail pages, banner images, and legacy landing-page images.
- [ ] Verify admin login, invitation activation, password reset, upload/preview, and an authenticated server action.
- [ ] Inspect the page HTML and network requests: no Supabase project hostname should be required by the browser.
- [ ] Confirm requests through /_gateway and /_media return expected content and do not expose upstream response bodies or secrets.
- [ ] Confirm Vercel generated deployment URLs are still SSO-protected.
- [ ] Verify Cloudflare is proxying the production DNS records and removing Vercel diagnostic headers.
- [ ] Confirm payment webhooks and all admin/API routes preserve authentication, signatures, idempotency, and response behavior.

Framework and hosting markers may still be inferred from behavior and asset paths. The primary goal here is to avoid exposing the actual Supabase project hostname/identifier or a public Vercel-origin bypass through ordinary page source and browser requests, while keeping real access controls intact.
