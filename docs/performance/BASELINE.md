# PhonerBazar Performance Baseline

Audit date: 2026-09-25 (+06:00)
Repository: `mdsahibx-prog/phonerbazer`
Branch audited: `main`
Commit audited: `6b1d0b01e547c190f41701d7956b1176dbeae9ad`

## Scope

Section 1 only. No production-critical application code was changed during this audit.

The supplied performance master prompt requires **Inspect → Measure → Remove → Optimize → Verify** and explicitly says not to modify production-critical code before the baseline, removal report, architecture report, and bottlenecks are identified.

## Repository / framework baseline

- Next.js: 16.3.0
- React / React DOM: 19.2.8
- TypeScript: 5.x
- pnpm: 11.21.0
- Supabase JS: 2.112.3
- Tailwind CSS: 4.x
- `next.config.ts` already enables AVIF/WebP, a 24-hour image cache TTL, and package-import optimization for `lucide-react` and `recharts`.
- The storefront uses App Router Server Components for route pages, with interactive UI extracted into client components in several areas.

## Route/data architecture observed

Public storefront routes include:

- `/`
- `/products`
- `/products/[slug]`
- `/categories`
- `/brands`
- `/search`
- `/cart`
- `/order`

The homepage calls `getHomepageData()`. The product listing page already parallelizes `getProducts()`, `getBrands()`, `getCategories()`, and `getProductTypes()` with `Promise.all`.

`lib/services/storefront.ts` currently uses:

- `unstable_cache` for homepage data (30s)
- `unstable_cache` for product-by-slug (60s)
- a shared `PRODUCT_SELECT` containing product, brand, category, and product-image fields
- a batched `getVariantsByProductId()` query using `.in('product_id', productIds)`

## Measured database baseline

Live Supabase `pg_stat_statements` was inspected on project `yirbztzrgsvxuetqqiov`.

Relevant observed application-query totals:

| Query family | Calls | Total execution | Mean execution |
|---|---:|---:|---:|
| storefront_variants by product_id | 851 | 1424.50 ms | 1.67 ms |
| homepage_banners active/order | 789 | 308.03 ms | 0.39 ms |
| categories active/order | 859 | 286.43 ms | 0.33 ms |
| brands active/order | 858 | 284.10 ms | 0.33 ms |
| products with broad product/brand/category/image projection | 324 | 247.18 ms | 0.76 ms |
| products with same broad projection, another observed shape | 324 | 232.37 ms | 0.72 ms |
| storefront_variants another observed shape | 142 | 179.07 ms | 1.26 ms |

These are cumulative database execution statistics from the current PostgreSQL statistics window, not end-user request latency.

## Table activity snapshot

At audit time:

| Table | Approx. size | Live rows | Seq scans | Index scans |
|---|---:|---:|---:|---:|
| products | 96 kB | 1 | 3205 | 2765 |
| product_variants | 112 kB | 1 | 1227 | 264 |
| product_images | 112 kB | 1 | 1924 | 0 |
| brands | 64 kB | 1 | 991 | 2079 |
| orders | 176 kB | 9 | 205 | 480 |
| order_items | 64 kB | 9 | 140 | 0 |

The current dataset is very small, so scan counts alone must not be treated as proof of production-scale latency.

## Web/Core Web Vitals baseline

Not measured in this audit:

- TTFB
- FCP
- LCP
- INP
- CLS
- browser JS transfer size
- CSS transfer size
- image transfer size
- real mobile network waterfall

No Lighthouse or browser performance result is being fabricated. These require a reproducible deployed-browser measurement pass.

## Build/lint baseline

Not executed through the GitHub connector in this Section 1 audit. Therefore no claim is made that `pnpm lint` or `pnpm build` currently passes.

## Baseline conclusion

The strongest current evidence is concentrated in the storefront data layer and client boundaries, not in raw PostgreSQL execution time. The next optimization phase should prioritize payload minimization, homepage/product query duplication, header client scope/search behavior, assistant configuration loading, and measurement of actual browser request waterfalls before making structural changes.
