# Landing-page performance notes

## Scope

Target: `/landing/nokia-6310-classic-phone`, mobile Lighthouse (Moto G Power / Slow 4G). Preserve the current visual design, order form, analytics consent and event flow, links, and stock/price behavior.

## Repository findings

- The route is an App Router Server Component and exports `revalidate = 60`, but its public data loader used `createClient()` from `lib/supabase/server.ts`. That helper reads request cookies. Public landing data therefore depended on request state even though the page is public, making reliable static/ISR caching harder.
- The route already emits a responsive hero-image preload from `getImageProps()`; the hero `next/image` also sets `preload` and `fetchPriority="high"`. Do not add another blind preload without checking the actual browser waterfall for duplicate/mismatched requests.
- `LandingConversionSections` is a large Client Component containing the hero, static sections, variant/quantity state, sticky CTA, and deferred order form. It is a plausible contributor to hydration and JS cost; splitting it safely requires a measured refactor because hero variant selection and order submission share state.
- `next.config.ts` already enables AVIF/WebP and `optimizePackageImports` for lucide-react/recharts. It has two Supabase image hosts in `remotePatterns`; tightening this to only one host could break existing content.
- `app/layout.tsx` mounts the consent-aware `AnalyticsRuntime`. Do not remove or defer it blindly: first-visit consent and page-view/event delivery must remain correct.
- The supplied PSI baseline (Oct 14, 2026): Performance 89, FCP 1.1 s, LCP 2.6 s, TBT 210 ms, CLS 0, Speed Index 5.6 s. LCP subparts: TTFB 10 ms, resource load delay 2,780 ms, load 170 ms, render delay 670 ms.

## Change in this PR

- Public landing-page data now uses the Supabase anon client and a 60-second Next.js `unstable_cache` entry instead of request-cookie-aware server client reads.
- The route explicitly uses `dynamic = 'force-static'` with `revalidate = 60`, so the public route can be statically rendered/cached rather than relying only on a cached data function.
- Public product-by-ID lookup used by landing pages is also cached for 60 seconds and uses the public anon client. Product visibility remains constrained to `is_published = true`; admin-only data paths continue using the session-aware server client.
- This is intended to make the public landing data render cacheable and reduce repeat server work before the hero preload can be emitted. It does not change image URLs, CSS, page content, order form logic, or analytics.

## Validation still required

The repository connector does not provide a local checkout/build runtime in this task. Do not treat the target metrics as achieved until Vercel preview build succeeds and a fresh mobile Lighthouse run against that exact preview records the new LCP breakdown, JS transfer, and all metrics. Also test: initial green hero image, switching color, order form submit, consent banner, and analytics events.

## Deferred work

- Capture a Chrome Network/Performance trace to confirm the preload is present early and matches the actual LCP request.
- Attribute the two PSI JS chunks with a bundle analyzer, then split server-renderable static sections from the interactive variant/order islands in small reviewed steps.
- Optimize the two render-blocking CSS assets only after inspecting emitted CSS and confirming the installed Next.js version's supported options; do not enable an experimental flag without a build test.
- Add Lighthouse CI only when the workflow has a reliable preview URL/build environment and required public Supabase build variables. Running CI against production on every PR would not validate the PR's code.
- Do not add strict Trusted Types/CSP or COOP changes without testing Supabase, GTM/Meta Pixel, and payment/order flows; these headers can break existing integrations.
