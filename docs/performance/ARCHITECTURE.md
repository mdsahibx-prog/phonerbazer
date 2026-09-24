# PhonerBazar Performance Architecture Audit

Audit date: 2026-09-25
Commit audited: `6b1d0b01e547c190f41701d7956b1176dbeae9ad`

## Current architecture

```
Next.js App Router
        │
        ├── Server route pages
        │      ├── Homepage
        │      ├── Catalogue
        │      ├── Product detail
        │      ├── Search
        │      └── Checkout / cart
        │
        ├── Server data layer
        │      └── lib/services/storefront.ts
        │             ├── Supabase public client
        │             ├── Supabase server client
        │             ├── unstable_cache
        │             └── product/variant normalization
        │
        └── Client interaction islands
               ├── Site header/search/menu
               ├── Product purchase interactions
               ├── Checkout forms
               ├── Mobile navigation
               └── Assistant UI
```

## What is already good

1. Route pages are predominantly Server Components.
2. Product listing already parallelizes independent supporting queries with `Promise.all`.
3. Homepage data uses `unstable_cache` with a 30-second revalidation window.
4. Product-by-slug data uses `unstable_cache` with a 60-second revalidation window.
5. Variant loading is batched with `.in('product_id', productIds)` instead of a per-product N+1 loop.
6. `next.config.ts` enables AVIF/WebP and image caching.
7. `lucide-react` and `recharts` package imports are configured for optimization.
8. Checkout/business-critical validation remains server-side in the existing architecture and must remain authoritative.

## Architecture risks

### Client boundary concentration

`SiteHeader` currently combines static branding/navigation with search, router state, menu state and effects. The preferred future boundary is:

```
Server SiteHeader
├── static logo/navigation
├── ClientSearch
└── ClientMobileMenu
```

This should be implemented only after measuring client bundle/hydration impact.

### Data projection concentration

`PRODUCT_SELECT` is a broad shared projection. The preferred future shape is:

```
PRODUCT_CARD_SELECT
PRODUCT_LIST_SELECT
PRODUCT_DETAIL_SELECT
PRODUCT_ADMIN_SELECT
```

The change should preserve every field required by the current consumer and be benchmarked before/after.

### Cache architecture

Current caching exists for homepage and product-by-slug. The next step should add explicit cache tags/invalidation only where the mutation graph is understood.

Suggested public tags:

- `homepage`
- `products`
- `product:{id}`
- `categories`
- `brands`
- `banners`
- `settings`
- `assistant-config`

Transaction authority must remain uncached or revalidated authoritatively for:

- checkout
- stock
- final price
- payment status
- order status
- customer data
- IMEI allocation

### Search architecture

Current:

```
query
  ↓
products + brands + variants
  ↓
optional brand → products query
  ↓
products query
  ↓
variants query
```

Preferred direction after measurement:

```
query
  ↓
normalized / indexed search
  ↓
small product-id/result set
  ↓
minimal card projection
```

Do not introduce an external search engine unless measured PostgreSQL performance cannot meet requirements.

## Dependency boundary notes

Declared dependencies include PDF generation, QR generation, charts, Supabase clients, forms, validation, and UI utilities.

Heavy functionality such as invoice PDF/QR generation and admin charts should remain outside the public storefront client graph. The Section 1 connector audit did not produce a reliable complete import graph for every dependency, so no dependency is marked removable yet.

## Image architecture

Current framework configuration already provides:

- AVIF/WebP
- responsive `sizes`
- long image cache TTL
- lazy loading for non-priority ProductMedia images

The LCP/hero implementation needs real browser measurement before changing priority/preload behavior.

## Analytics / third parties

The repository contains a central analytics control center supporting GA4, GTM, Meta Pixel, Meta CAPI and server-side GTM configuration. Analytics functionality must remain intact during performance work.

The correct optimization boundary is asynchronous/non-blocking loading and consent-aware execution, not disabling analytics.

## Security constraints

Performance work must not weaken:

- Supabase RLS
- authentication
- authorization
- server-side price validation
- stock validation
- payment verification
- order idempotency
- courier security
- secret handling

No service-role or private credentials should enter client bundles.

## Section 2 entry criteria

Before implementation begins, collect:

1. Mobile and desktop browser waterfall for homepage.
2. LCP element and image bytes.
3. Initial JS transfer and hydration cost.
4. Search request waterfall while typing.
5. Product detail request waterfall.
6. Catalogue request count with and without exact count.
7. Vercel server/request timing.
8. Repeatable Supabase query statistics after representative traffic.

Only then implement the smallest measured optimization.
