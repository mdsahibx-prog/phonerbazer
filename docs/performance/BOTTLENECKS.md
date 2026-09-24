# PhonerBazar — Evidence-Based Bottlenecks

Audit date: 2026-09-25
Commit audited: `6b1d0b01e547c190f41701d7956b1176dbeae9ad`

These are the ten highest-value bottleneck candidates supported by repository inspection and/or live database evidence. They are not performance scores or guesses about user-perceived latency.

## 1. Broad product projection is reused across card/list/detail consumers

**Evidence:** `lib/services/storefront.ts` defines `PRODUCT_SELECT` with description, warranty, SEO metadata, timestamps, nested brand/category metadata, and all product images. The same projection is used by homepage, listing and detail paths.

**Why it matters:** Product-card use cases do not need the complete product/detail/SEO payload. This increases database response and serialization work.

**Next measurement:** Compare response bytes and server time for current projection versus consumer-specific card projection.

## 2. Homepage loads latest and featured product pools separately

**Evidence:** `getHomepageData()` executes separate latest and featured product queries, then de-duplicates product IDs only for the subsequent variant query.

**Why it matters:** Overlap between the two pools can cause repeated product-row work and repeated nested relation materialization.

**Next measurement:** Measure overlap count and payload size between the two result sets in production-like data.

## 3. Homepage product data still requires a second variant query

**Evidence:** After the latest/featured product queries complete, `getHomepageData()` calls `getVariantsByProductId()`.

**Database evidence:** The corresponding `storefront_variants` query has 851 calls and 1424.50 ms cumulative execution, 1.67 ms mean, during the current statistics window.

**Interpretation:** Database execution itself is modest per call, but this is a high-frequency data path and should be measured as part of full request latency.

## 4. Header is a large client component

**Evidence:** `components/layout/site-header.tsx` is `'use client'` and owns pathname/router state, menu state, search state, effects, fetch logic, dropdown rendering, and both desktop/mobile search UIs.

**Why it matters:** The whole header becomes part of a client boundary rather than only the interactive islands.

**Next measurement:** Compare client JS/hydration cost and RSC/client graph before and after a split-header prototype.

## 5. Header search fires client requests after a 300 ms debounce

**Evidence:** `site-header.tsx` performs `fetch('/api/search?...')` after 300 ms whenever the query has at least two characters.

**Risk:** There is no AbortController in the inspected implementation, so a stale request can complete after a newer query and potentially overwrite suggestions.

**Next measurement:** Browser network waterfall while typing rapidly; count concurrent/stale requests.

## 6. Assistant configuration is loaded on every storefront layout execution

**Evidence:** `app/(storefront)/layout.tsx` awaits `loadAssistantControlConfig()`. The implementation reads the `settings` table through the admin Supabase client.

**Why it matters:** This is a shared storefront layout dependency, so the configuration lookup can affect every storefront request/navigation that reaches the server layout.

**Next measurement:** Measure request count and server timing for `settings.key = assistant_config` and test a server cache with explicit admin invalidation.

## 7. Product listing performs an exact count

**Evidence:** `getProducts()` uses `select(PRODUCT_SELECT, { count: 'exact' })`.

**Why it matters:** Exact counts are explicitly called out by the master prompt as something to use only where the UI requires an exact total. The catalogue UI currently displays the total, so this is not automatically removable; it is a measurable cost candidate.

**Next measurement:** Compare exact-count and no-count/cursor variants for real catalogue sizes before changing behavior.

## 8. Search resolution uses multiple database queries before the main product query

**Evidence:** `resolveProductIdsForSearch()` queries products, brands, and storefront variants in parallel, then may issue another product query for matching brand IDs. `getProducts()` then applies the resulting IDs to a second products query.

**Why it matters:** Parallelism reduces wall-clock waiting but does not eliminate total database work. Search can become a multi-query pipeline.

**Next measurement:** Per-search query count, response time, and payload size for name/brand/SKU searches.

## 9. Related products can execute several catalogue queries

**Evidence:** `getRelatedProducts()` first queries the category and, if insufficient results are found, executes product-type and brand queries in parallel. Each result uses the full `getProducts()` pipeline.

**Why it matters:** Related-product rendering should use lightweight card data; the current path reuses the broader catalogue function.

**Next measurement:** Product-page request waterfall and related-product query count.

## 10. Image delivery is configured well at framework level, but actual asset payload is unmeasured

**Evidence:** `next.config.ts` enables AVIF/WebP and a 24-hour image cache TTL; ProductMedia uses responsive `sizes` and lazy loading for non-priority images.

**Gap:** Actual source dimensions, encoded bytes, LCP image behavior, and banner payload sizes have not been measured.

**Next measurement:** Capture real mobile image requests and LCP element bytes before changing image quality/priority settings.

## Important database context

Live Supabase statistics show the application query families are generally low mean execution time (sub-2 ms for the highlighted storefront query families). The current database contains very few product rows, so the audit does **not** conclude that PostgreSQL is currently the primary user-visible bottleneck.

The highest-confidence next step is end-to-end browser/request measurement combined with consumer-specific data projections.
