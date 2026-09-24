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

The search API still uses the existing authoritative `getProducts` search pipeline, but it no longer serializes the complete normalized product object to the browser.

The response is limited to fields required by the header suggestion UI:
- id
- name
- slug
- variant price/availability fields
- image fields

No search semantics, product pricing logic, stock validation, or backend query authority was changed.

## Deliberately not changed

- checkout/order validation
- stock reservation
- payment verification
- courier logic
- Supabase RLS/authentication
- PRODUCT_SELECT
- exact catalogue count
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
