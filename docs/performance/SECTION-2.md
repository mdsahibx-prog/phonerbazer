# Section 2 Performance Optimization

Date: 2026-09-25

## Scope

Section 2 started from the Section 1 audit findings without changing checkout, stock, payment, courier, authentication, authorization, or Supabase security behavior.

## Implemented

### 1. Cancel stale header-search requests

File: `components/layout/site-header.tsx`

The 300ms debounce remains unchanged, but each search request now uses an `AbortController`.

When the query changes or the component unmounts:
- the pending timer is cleared;
- the previous request is aborted;
- stale responses cannot overwrite the latest suggestion list;
- loading state is not reset by an obsolete request.

This directly addresses the Section 1 finding that header search had debounce but no stale-request cancellation.

### 2. Reduce search suggestion response payload

File: `app/api/search/route.ts`

The search API now uses a dedicated lightweight `getSearchSuggestions` path. It keeps the existing authoritative PostgreSQL/Supabase search resolution, removes the unnecessary exact-count query, and serializes only the fields required by the header suggestion UI.

The response is limited to fields required by the header suggestion UI:
- id
- name
- slug
- variant price/availability fields
- image fields

No search semantics, product pricing logic, stock validation, or backend query authority was changed.



### 3. Purpose-specific storefront product projections

File: `lib/services/storefront.ts`

Added separate projections for:
- product cards/homepage/listing data;
- full product-detail data.

Homepage and related/search card paths no longer request SEO metadata, long descriptions, internal status fields, or oversized brand/category/image relations when those consumers do not render them. Product detail keeps the complete projection required for metadata, structured data, specifications, warranty, and description.

Related-product loading now uses a no-count lightweight card path instead of the exact-count catalogue path.

### 4. Automated performance-audit foundation

Added:
- `performance.config.ts`
- `scripts/performance/audit.ts`
- `scripts/performance/database.ts`
- `scripts/performance/queries.ts`
- `scripts/performance/bundle.ts`
- `scripts/performance/images.ts`
- `scripts/performance/routes.ts`
- `scripts/performance/lighthouse.ts`
- `scripts/performance/report.ts`
- `scripts/performance/thresholds.ts`

Added `pnpm performance:audit` and wired it after the existing build in the database-runtime CI workflow. The audit reports unavailable external/browser/database measurements as `NOT MEASURED` rather than inventing values or failing for missing optional services.

## Deliberately not changed

- checkout/order validation
- stock reservation
- payment verification
- courier logic
- Supabase RLS/authentication
- checkout/order validation and transactional data authority
- image priority/LCP behavior
- SiteHeader server/client boundary

Those items require the Section 2 browser/query measurements identified in `docs/performance/ARCHITECTURE.md` before changing them safely.

## Deployment

Changes were pushed to `main`. Vercel automatically created production deployments for the two commits:

- `861ae10936479ef23f9bfee9273c37cacad904c6` — stale search cancellation
- `c54e6058fe4312594941e787152bb581f9ffac1e` — search response minimization

At audit time, the corresponding Vercel deployments were still building/queued, so this report does not claim a completed production verification.

## Next measured Section 2 targets

1. Capture real mobile/desktop homepage waterfall and LCP.
2. Measure initial JS/hydration cost.
3. Measure search request timings after stale cancellation.
4. Benchmark catalogue exact-count cost.
5. Measure product-detail request waterfall.
6. Then make the next smallest measured optimization.
