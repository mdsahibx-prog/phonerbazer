# Landing Page Mobile Speed & Conversion Optimization Map

Date: 2026-10-13
Repository: `mdsahibx-prog/phonerbazer`
Target route: `/landing/nokia-6310-classic-phone`

## Goal

Keep the landing page fast on real mobile devices and make ordering easy, without changing live product prices, stock authority, COD quote/order actions, analytics consent, or checkout behavior.

## Inspection findings (code-backed)

1. **The hero image is the LCP candidate.** `ProductHero` renders a responsive Next.js `Image` with `priority`; below-the-fold color photos use lazy loading. This is the right starting pattern, but actual LCP and transferred image bytes have not been measured for this route.
2. **A single client boundary contains most landing-page interactions and presentation.** `LandingConversionSections` is a client component because color/quantity selection, sticky CTA, and the order form share state. The file is about 36.8 KB of source text; that is not a measurement of minified or compressed JavaScript. A server/client split could reduce client JS, but needs a dedicated refactor and before/after bundle plus interaction testing.
3. **Sticky CTA listens to scroll.** The previous handler called the state setter on every scroll event and did not evaluate scroll position at mount, which can leave the CTA hidden when a browser restores a scrolled position.
4. **Order links always requested smooth scrolling.** This did not honor visitors' reduced-motion preference.
5. **Performance audit did not include this landing route.** The audit script's route list only covered homepage, products, search, categories, and brands, so future route checks could miss this conversion-critical page.
6. **No verified sub-second/Lighthouse result exists for this landing route.** The repository's performance audit intentionally reports Lighthouse as NOT MEASURED because no Chrome/Lighthouse runner is installed. Prior homepage scores are not a substitute for route-specific mobile results.

## Implemented in this change

- Update sticky CTA visibility only when crossing the 420px threshold; initialize it on mount to handle restored scroll position. Keep the listener passive.
- Honor `prefers-reduced-motion: reduce` when scrolling to the order form.
- Remove unnecessary desktop bottom padding that was only needed to make room for the mobile sticky CTA.
- Add the Nokia 6310 landing route to the existing performance route checks, so the current audit script records response status, TTFB estimate, and HTML bytes for this page.
- No new dependency; no changes to prices, stock, delivery quote, COD order submission, analytics, or database schema.

## Verification plan

1. Run `pnpm lint`, `pnpm test`, and `pnpm build` in the project CI/Vercel build.
2. Run the performance audit with `PERFORMANCE_BASE_URL=https://www.phonerbazar.store pnpm performance:audit`; treat its TTFB as a route-request sample, not a complete browser render metric.
3. Use PageSpeed Insights/Lighthouse on the exact landing URL with a mobile profile and record LCP element, LCP image bytes, FCP, TBT/INP, CLS, and JS transfer size.
4. Manually verify at narrow widths: hero image and price fit, both color cards remain selectable, selected color stays synchronized with the order form, sticky CTA does not cover form controls, and quote/order success still works.
5. Only then consider a larger optimization: split static gallery/features/FAQ/specification rendering into Server Components while keeping the shared variant selection and order form in the smallest necessary client island. Compare bundle and mobile metrics before merging.

## Guardrails

- A fast response is not the same as a fast visual render; do not promise “under one second” without a repeatable real-browser measurement.
- Do not cache or trust final price, availability, delivery quote, or order state on the client.
- Do not remove analytics providers; keep their existing consent gating.
- Do not add fake scarcity, fabricated reviews, or unverified performance claims.
