# PhonerBazar — Full Performance Audit Report

Audit date: 2026-09-24/25
Repository: mdsahibx-prog/phonerbazer
Audited commit: 88a47286a770b9f095e295f27108176c6edb2937
Production deployment checked: dpl_5gKBKf5AGFvTGv7bscUUkAo4xsMR
Production state: READY
Scope: Audit only — no production-code implementation in this audit.

## 1. Executive summary

PhonerBazar is already using several sound performance patterns: server-rendered storefront routes, parallel Promise.all for independent catalogue lookups, purpose-specific product projections introduced in Section 2, responsive image sizing, lazy non-critical product images, dynamic import for the assistant panel, and server-authoritative checkout/cart validation.

The main performance risk is not one isolated slow function. It is the cumulative cost of a dynamic storefront request path:

1. Storefront layouts execute server-side settings/configuration reads on navigation.
2. Several catalogue pages still use the heavier getProducts pipeline with exact counts and related data.
3. The homepage combines multiple catalogue/settings/banner reads.
4. Offers performs a broad 48-product read and then filters variants in application code.
5. Product/brand/search pages can trigger repeated related catalogue reads and exact-count work.
6. The production HTML sample shows private/no-store caching and a Vercel cache MISS. This sample is not a clean CDN benchmark because the Vercel fetcher appends a _vercel_share parameter, so caching must be re-measured from a normal browser request before changing cache policy.
7. The initial homepage response references 11 JavaScript chunks whose uncompressed response text totals about 610,750 characters (~596 KiB), plus two CSS chunks totaling about 112,523 characters (~110 KiB). These are source/response-character measurements, not Brotli transfer bytes.
8. The hero currently renders both mobile and desktop Image variants for the first slide with priority, which can cause duplicate high-priority image work.
9. Supabase performance advisors currently report 17 unindexed foreign keys, 43 unused indexes, 47 multiple-permissive-policy findings, and 4 duplicate-index findings. These are audit signals, not automatic drop/fix instructions.
10. Database statistics are currently too small to represent production-scale catalogue performance: pg_stat_user_tables reports only 1 live row in products, brands, categories, product_images, and product_variants at audit time. Therefore query latency at realistic catalogue scale was NOT MEASURED.

Overall conclusion: the application has a good foundation, but the 1-second storefront target cannot be certified from the current evidence. The highest-value work is to reduce repeated server-side catalogue/config reads, separate lightweight discovery/card queries from full product-detail queries everywhere, verify normal-request caching, and obtain real mobile-browser LCP/INP/CLS plus realistic Supabase query timings.

## 2. Audit scope and method

This audit followed the supplied Full Performance Audit Mode brief: inspect existing code and infrastructure, measure where evidence is available, identify bottlenecks, report findings, and suggest changes without implementing production optimizations.

Inspected:
- Next.js App Router storefront routes and layouts.
- Product/card/detail components.
- Header/search, hero, cart, checkout and assistant boundaries.
- Storefront service/query layer.
- Commerce/cart and payment endpoints.
- Analytics runtime and server configuration.
- Next.js image/security configuration.
- Vercel production deployment state and sampled production HTML/assets.
- Supabase indexes, table/index statistics, performance advisors and security advisors.
- Existing Section 1 and Section 2 performance documents.

Not measured:
- Real-device LCP, INP and CLS.
- Lighthouse scores on a controlled mobile profile.
- Supabase query duration distributions from production traffic.
- Real production RUM by route/device.
- Full compressed transfer size of every route's JS/CSS/image waterfall.

## 3. Verified production/deployment baseline

Latest audited Git commit:
- 88a47286a770b9f095e295f27108176c6edb2937
- fix: correct related product array typing

Vercel:
- Deployment: dpl_5gKBKf5AGFvTGv7bscUUkAo4xsMR
- State: READY
- Target: production
- Region: iad1
- Production aliases include phonerbazar.store and www.phonerbazar.store.

Sampled production route fetches returned HTTP 200:
- /
- /products
- /search?q=iphone
- /offers

The production HTML is Next.js streamed/RSC output. The response initially contains a storefront loading boundary before the streamed content is inserted. This is normal Next.js streaming behavior, but it means the perceived loading experience must be judged with a real browser rather than HTML fetch alone.

The sampled homepage response returned:
- content-encoding: br
- cache-control: private, no-cache, no-store, max-age=0, must-revalidate
- x-vercel-cache: MISS
- transfer-encoding: chunked

Important measurement limitation: the Vercel fetcher adds a _vercel_share query parameter. Therefore this cache result is evidence of the sampled response behavior, not a definitive normal-user CDN-cache benchmark.

## 4. Current architecture assessment

### Strengths

- App Router/server components are used for catalogue pages.
- Product card rendering is server-side.
- Client interactivity is isolated in components such as SiteHeader, ProductPurchaseActions, ProductDetailInteractive, CartClient and checkout flows.
- The assistant panel is dynamically imported with ssr:false and is only opened on demand.
- Independent catalogue metadata requests on /products are already parallelized with Promise.all.
- Cart writes validate against authoritative product_variants/products data rather than relying on presentation-oriented storefront views.
- Payment endpoints use force-dynamic and private/no-store responses.
- Image configuration enables AVIF/WebP and a 24-hour minimum image cache TTL.
- lucide-react and recharts are configured for package-import optimization.
- The header search now cancels stale requests with AbortController.

### Architecture risks

- RootLayout calls getAnalyticsConfig on every request path, even though that function is internally cached for 60 seconds.
- Storefront layout/configuration also reads assistant configuration, creating another request-path dependency.
- Dynamic server-side configuration reads contribute to a dynamic rendering model and make aggressive public HTML caching harder.
- The current codebase mixes lightweight product-card paths with full getProducts paths. Section 2 improved this boundary, but several high-traffic pages still use the full pipeline.
- Product discovery pages can request exact totals even where a bounded result set may be enough for the user experience.

## 5. Server-side query/data audit

### /products

Current page executes in parallel:
- getProducts(filters)
- getBrands()
- getCategories()
- getProductTypes()

This is correctly parallelized, but getProducts remains the heaviest operation because the catalogue UI needs an exact total and filters.

Recommendation:
- Keep exact count only where the UI genuinely requires an exact total.
- Consider a bounded "has next page" strategy for mobile/listing paths if exact totals are not business-critical.
- Cache low-churn brand/category/product-type metadata.
- Benchmark the full getProducts query at realistic catalogue scale before changing it.

### /search

The dedicated header suggestion path now uses getSearchSuggestions rather than the full exact-count catalogue query. This is a meaningful improvement.

The full /search page still uses getProducts with an exact total. This is appropriate if the total is retained, but should be benchmarked because search can become a high-frequency query path.

### /offers

Current implementation:
- getProducts({ pageSize: 48, sort: 'newest' })
- getHomepageData()
- application-level filtering of returned products by whether any variant has a compare_at_price greater than price.

This is a clear optimization candidate.

The page reads up to 48 products and all selected variants, then filters in JavaScript. A dedicated discounted-products query/view should be evaluated so the database performs the discount predicate and only the needed card projection is returned.

### /brands/[slug]

The page:
- loads the brand,
- then runs getProducts({ brand, pageSize: 48 }),
- and uses result.total for the published product count.

This can become expensive as a brand catalogue grows. A lightweight brand product-card query plus a separate count, or a cached/materialized count if business requirements allow, should be benchmarked.

### Product detail

Product detail legitimately needs a larger payload: variants, images, category, brand and policy-related context. This should remain separate from the card/list projection.

The current interactive detail component is substantial and client-side, but the heavy product data is already server-resolved. Do not move authoritative stock/price validation client-side for performance.

### Related products

Section 2 moved related-product discovery toward the lightweight card path. This is correct directionally. It should be retained and benchmarked for category/brand-heavy pages.

## 6. Homepage audit

The homepage is a high-priority route because it combines:
- hero/banner data,
- product collections,
- categories/brands/discovery data,
- settings/configuration,
- analytics/assistant layout dependencies.

The code already uses parallel data access in important places.

Primary remaining risk:
- repeated configuration reads at the layout level,
- separate product collection reads,
- broad product card payloads where only card fields are needed,
- and image/hero payload competition.

### Hero image issue

HeroSection renders both mobile and desktop Next Image elements for each visible slide. For the first slide, both variants have priority={true} and loading="eager".

This can create duplicate high-priority image work for the same hero slide even though only one variant is visible at a time.

Recommendation:
- Measure actual request behavior first.
- If duplicate priority requests are confirmed, choose one responsive image strategy or ensure only the active viewport variant receives high priority.

## 7. Client-side audit

### SiteHeader

Good:
- 300 ms debounce remains.
- AbortController cancels stale requests.
- Stale responses are prevented from overwriting newer state.

Remaining cost:
- SiteHeader is a large client component and is mounted on every storefront page.
- It owns desktop/mobile search, menu state, pathname state and dropdown rendering.
- The search API uses cache:no-store, which is appropriate for fresh suggestions but prevents browser reuse.

Recommendation:
- Keep the interactive boundary, but consider splitting static header markup from the interactive search/menu islands.
- Measure JS contribution before making the split.
- Do not cache stale search data in a way that risks incorrect availability/price display.

### ProductPurchaseActions

The product card purchase controls are client-side and invoke server actions for Add to Cart and Buy Now. This preserves authoritative business logic.

Potential UX latency:
- Add to Cart waits for the server action before reporting success.
- Buy Now waits for prepareGuestCheckout before routing.

This is correct for correctness/security. The performance opportunity is in server-path reduction and immediate, truthful pending UI rather than weakening validation.

### CartClient

Good:
- optimistic remove,
- optimistic quantity updates,
- quantity debounce,
- server reconciliation.

Remaining concern:
- updateCartItem and removeCartItem return a fully reloaded cart.
- That cart reload reads cart rows plus products plus variants plus storefront settings.

For a larger cart this is unnecessary work after every mutation.

Recommendation:
- Benchmark whether mutation responses can return the authoritative changed line plus authoritative totals from the same server operation.
- Do not remove server-side revalidation.

## 8. Checkout audit

The checkout architecture is intentionally authoritative:
- product/variant are server-resolved,
- final quote is server-resolved,
- stock/delivery/order rules remain server-authoritative,
- payment endpoints are dynamic and no-store,
- idempotency is present in payment initiation.

This is a correctness strength and should not be traded for client-side shortcuts.

Performance opportunities:
1. Reduce repeated reads between contact → delivery → review where the same verified state can safely be reused.
2. Parallelize independent quote-support reads only where they are actually independent.
3. Cache static geography/reference data.
4. Keep final stock, price, delivery and fraud checks server-side.
5. Measure each checkout step separately: prepare checkout, quote, submit order, payment status.

The audit does not recommend bypassing any of these authoritative checks.

## 9. API audit

### Search API
The header search endpoint now uses a dedicated lightweight suggestion path and returns only the fields required by the dropdown.

### Analytics API
Client commerce events can POST to /api/analytics. The server validates the event schema, persists the event and then dispatches analytics destinations.

Potential cost:
- Each opted-in client event can create a server request and persistence operation.
- Dispatch can call external analytics endpoints with retry/timeouts.

Recommendation:
- Keep event persistence off the critical checkout response path where possible.
- Batch non-critical analytics where measurement requirements permit.
- Measure analytics request volume separately from commerce request volume.

### Assistant API
The assistant endpoint is explicitly force-dynamic/no-store and has request-size, rate-limit and timeout-related controls. This is appropriate for an interactive AI service.

It should remain excluded from the core purchase path.

### Payment API
Payment initiation/status routes use force-dynamic and private/no-store. This is appropriate and should not be cached.

## 10. Image and asset audit

### Positive findings

- Next Image is used for product cards and hero images.
- Product cards define responsive sizes.
- Images are lazy-loaded except for priority content.
- AVIF/WebP are enabled.
- Image cache TTL is 86400 seconds.
- Product detail uses native img because dynamic Supabase assets are not configured for Next remote optimization; this is a measurable optimization opportunity.

### Risks

- Product detail uses raw <img> for the main product image and gallery, so Next image optimization is bypassed there.
- Category discovery cards also use raw <img>.
- Offers banner cards use raw <img>.
- Hero renders mobile and desktop image elements simultaneously.
- The repository contains public/logo.png at approximately 720,634 bytes (~704 KiB). Usage was not established during this audit, so it is a candidate for cleanup only if confirmed unused.

Recommendation:
- Measure actual image transfer sizes and LCP contribution before changing image components.
- Convert/resize large source assets at upload time where possible.
- Ensure above-the-fold mobile hero/product images have a mobile-appropriate source.
- Avoid duplicate priority images.

## 11. JavaScript/CSS payload audit

The sampled homepage references 11 initial JavaScript chunk assets. Fetching those assets and summing their uncompressed response text produced approximately:

- JavaScript source/response text: 610,750 characters (~596 KiB)
- CSS source/response text: 112,523 characters (~110 KiB)

These are not wire-transfer byte measurements because Vercel serves compressed assets and the fetch tool does not expose reliable decoded transfer sizes for this sample.

The homepage also has route-specific chunks on /products and /search.

The largest individual sampled JS chunks were approximately:
- 235,407 characters
- 130,653 characters
- 39,735 characters
- 36,627 characters
- 34,492 characters

This indicates meaningful client payload even before measuring real mobile execution cost.

Recommendation:
- Use a production browser bundle analyzer and route-level JavaScript attribution.
- Prioritize client components mounted on every storefront route.
- Keep heavy interactive tools dynamically imported.

## 12. Caching audit

Existing positive caching:
- Analytics config uses unstable_cache with 60-second revalidation.
- Brand detail pages export revalidate = 300.
- Image cache TTL is 86400 seconds.

Main concern:
- Root/storefront layouts perform dynamic configuration reads.
- The sampled production HTML response was private/no-store and a Vercel cache MISS.
- Because the audit fetcher appends _vercel_share, this must be rechecked with a normal browser request before concluding that public CDN caching is completely disabled.

High-value investigation:
1. Determine exactly which request dependency marks each route dynamic.
2. Separate public immutable/storefront configuration from per-request state.
3. Add safe route-level revalidation only where data is genuinely public and acceptable to be stale.
4. Never cache cart, checkout, payment, customer, admin or other personalized data.

## 13. Supabase database audit

Supabase performance advisor findings observed at 2026-09-24T20:01:30Z:

- 17 unindexed foreign keys.
- 43 unused-index findings.
- 47 multiple-permissive-policy findings.
- 4 duplicate-index findings.

### Duplicate indexes

Advisor identified identical indexes on:
- customers: customers_phone_idx / idx_customers_phone
- delivery_provider_credentials: delivery_provider_credentials_provider_idx / delivery_provider_credentials_redx_idx
- orders: idx_orders_status_created / orders_status_created_idx
- product_images: idx_product_images_one_primary / product_images_one_primary

These should not be blindly dropped. First verify migration intent and query plans.

### Unindexed foreign keys

The advisor identified 17 foreign keys without covering indexes, including:
- cart_items.product_id
- cart_items.variant_id
- checkout_sessions.completed_order_id
- commerce_events.cart_id
- customer_addresses.customer_id
- order_items.product_id
- order_items.variant_id
- product_images.product_variant foreign key

These are candidates for targeted index review, especially on growing transactional tables.

### Multiple permissive RLS policies

47 findings were reported. This can add policy evaluation work per query.

Do not collapse policies blindly. Review each table's policy semantics and consolidate only where equivalent access behavior is provably preserved.

### Current index-usage evidence

pg_stat_user_indexes shows high activity on:
- settings key index,
- products primary key,
- brands/categories primary keys,
- orders status-created index,
- product variants primary key,
- cart/carts indexes.

However, the database currently reports only about 1 live row in several core catalogue tables. Therefore current index usage is not representative of future catalogue scale.

### Important conclusion

Database performance cannot be certified from current statistics. The dataset is too small for realistic catalogue query benchmarking.

## 14. Supabase security/performance cross-check

Security advisor findings observed at 2026-09-24T20:01:32Z:
- 2 RLS-enabled tables without policies:
  - inventory_cost_balances
  - inventory_receipts
- leaked-password protection is disabled.

These are security findings rather than direct storefront-performance blockers. They should be handled through the project's security review process, not mixed into a performance-only optimization without confirming intended access behavior.

## 15. API/query hotspot matrix

| Area | Current behavior | Risk | Priority |
|---|---|---|---|
| Homepage | Multiple catalogue/config reads | High cumulative server cost | P0 |
| /products | Full product query + metadata queries | Exact count and broad data | P0 |
| /search | Exact-count product search | High-frequency query path | P1 |
| /offers | 48 products + variant filtering in JS | Overfetch | P0 |
| /brands/[slug] | Up to 48 products + exact total | Scales with brand size | P1 |
| Related products | Lightweight path after Section 2 | Improved, needs measurement | P2 |
| Header search | Debounced + cancellable | Good, API no-store | P2 |
| Cart mutation | Mutation then full cart reload | Repeated reads | P1 |
| Checkout | Server-authoritative | Correct but potentially multi-step | P1 |
| Analytics | Client event POST + persistence/dispatch | Background request volume | P2 |
| Assistant | Dynamic/no-store, excluded from checkout | Isolated cost | P2 |
| Hero images | Mobile + desktop priority variants | Duplicate high-priority work | P1 |

## 16. Priority matrix

### P0 — investigate first

1. Measure and reduce homepage server dependency chain.
2. Benchmark getProducts exact-count cost at realistic catalogue scale.
3. Replace offers' broad 48-product + application filtering with a dedicated lightweight discounted-products query candidate.
4. Verify normal production caching and identify the exact dynamic dependencies preventing public caching/revalidation.
5. Establish real mobile LCP/INP/CLS and route-level browser waterfalls.

### P1 — next

6. Review /brands/[slug] query/count strategy.
7. Reduce cart mutation response work where safe.
8. Review unindexed foreign keys on growing commerce tables.
9. Review duplicate indexes with migration history.
10. Remove duplicate hero priority image work if browser measurement confirms it.

### P2 — after measurement

11. Split SiteHeader into smaller interactive islands if bundle analysis confirms benefit.
12. Optimize raw <img> usage on product detail/discovery surfaces.
13. Reduce analytics request overhead and duplicate page-view behavior.
14. Review multiple-permissive RLS policies for both security and query overhead.

## 17. Quick wins

These are recommendations only; they were not implemented during this audit.

1. Cache low-churn public metadata: brands, categories, product types.
2. Use dedicated card projections everywhere a page does not need full product details.
3. Avoid exact counts on high-frequency search/list paths when product totals are not essential.
4. Give offers a dedicated discounted-product query.
5. Confirm and remove duplicate hero priority work.
6. Fix the AnalyticsProvider cleanup event-name mismatch:
   - listener added: sahigadget-consent-change
   - cleanup removes: phonerbazar-consent-change
   This can leave an event listener attached across effect re-runs.
7. Benchmark and potentially reduce cart full reloads after mutation.
8. Re-measure normal CDN caching without Vercel share parameters.

## 18. Advanced optimization candidates

### Server
- Route-level ISR/revalidation for public catalogue pages.
- Cached public settings snapshots.
- Dedicated query functions for:
  - homepage cards,
  - offers,
  - search suggestions,
  - brand cards,
  - category cards.
- Avoid loading variant/image fields not required by a specific card.
- Consider a materialized/public catalogue read model only if real scale warrants it.

### Database
- Add only indexes proven useful by query plans and realistic data volume.
- Review the 17 unindexed foreign keys.
- Remove duplicate indexes only after migration/reference validation.
- Consolidate redundant RLS policies only after policy-equivalence review.
- Capture query latency by normalized query signature.

### Client
- Split SiteHeader into static shell + search/menu islands.
- Keep assistant panel dynamically imported.
- Analyze route-level JS with a production bundle analyzer.
- Reduce always-mounted client components.
- Use native responsive images or optimized remote image handling for detail/discovery images where appropriate.

### Network
- Verify Brotli transfer sizes.
- Verify image CDN cache hits.
- Establish cache hit/miss ratios by route and asset.
- Measure Supabase connection/query latency from iad1.
- Consider region alignment only after measuring real database round-trip latency.

## 19. One-second target analysis

A reliable 1-second target requires a real mobile-browser budget, not just server response time.

Suggested budget:

- DNS/TLS/connection: <= 150 ms
- TTFB: <= 250 ms
- HTML/RSC first meaningful content: <= 350 ms
- Critical JS/CSS execution: <= 200 ms
- LCP resource discovery/download/decode: <= 350 ms
- Main-thread blocking: minimized; INP should remain comfortably below the interaction budget.

Current evidence does not prove these targets are met.

The biggest structural threats to the 1-second goal are:
- dynamic request-path configuration reads,
- exact-count/broad catalogue queries,
- broad offers query,
- potentially duplicate hero priority images,
- and a non-trivial always-mounted client JavaScript payload.

## 20. Measurement plan required before implementation

Run the following controlled benchmark set:

### Browser
Device profiles:
- 360x800
- 375x812
- 390x844
- 412x915

Network:
- Fast 4G
- Slow 4G
- Optional 3G stress test

Routes:
- /
- /products
- /products/[real-product-slug]
- /search?q=[real-query]
- /offers
- /categories
- /brands
- /brands/[real-brand]
- /cart
- /order

Record:
- TTFB
- FCP
- LCP
- INP
- CLS
- total JS transfer
- total JS execution
- total image transfer
- number of requests
- Supabase/API request waterfall
- cache hit/miss

### Database
Use realistic seed volume before drawing scale conclusions:
- 100 products
- 500 variants
- 1,000+ product images
- realistic brand/category counts
- representative carts/orders

Capture:
- query duration p50/p95/p99
- rows scanned/returned
- exact-count duration
- variant join duration
- homepage aggregate duration
- offers query duration
- search duration

## 21. Recommended implementation roadmap

### Phase A — measurement
- Establish browser/RUM baseline.
- Establish realistic Supabase dataset.
- Capture query timings.
- Capture normal CDN cache behavior.

### Phase B — P0 query/caching work
- Public metadata caching.
- Dedicated offers query.
- Homepage query consolidation.
- Exact-count review.
- Route revalidation where safe.

### Phase C — P1 transactional/read-path work
- Cart mutation response optimization.
- Brand page query optimization.
- Foreign-key index review.
- Duplicate-index review.

### Phase D — client/image work
- Header island split only if bundle analysis supports it.
- Hero priority/image strategy.
- Product-detail image optimization.
- Route-level JS reduction.

### Phase E — verification
- Production build.
- Vercel READY deployment.
- Mobile browser verification.
- Repeat all performance measurements.
- Compare against baseline.
- Only then promote the next optimization batch.

## 22. Audit-only change control

No production optimization was implemented as part of this full audit.

The latest production code remains:
88a47286a770b9f095e295f27108176c6edb2937

The audit itself is the only requested repository artifact from this phase.

## 23. Final assessment

PhonerBazar has a credible performance foundation, and Section 2 already removed several avoidable costs. The remaining performance ceiling is primarily constrained by server-side data access patterns, dynamic rendering dependencies, catalogue query breadth, and lack of realistic browser/database measurements.

The project should not yet claim a verified 1-second storefront target.

The highest-value next step is measurement-backed P0 work: obtain real mobile LCP/INP/CLS and realistic Supabase query timings, then address homepage/catalogue/offer query breadth and safe public caching. This preserves the existing checkout, inventory, payment, courier and security authority while targeting the actual sources of latency.
