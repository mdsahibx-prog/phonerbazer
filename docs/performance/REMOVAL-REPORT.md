# PhonerBazar Removal Report

Audit date: 2026-09-25
Commit audited: `6b1d0b01e547c190f41701d7956b1176dbeae9ad`

## Policy

No code, dependency, component, database object, environment variable, or asset was deleted during Section 1.

The master prompt requires every removal to be verified as clearly unused before deletion.

## Candidates requiring verification

| File / area | Item | Evidence currently available | Risk | Action |
|---|---|---|---|---|
| `package.json` | `recharts` | Declared dependency; repository connector did not provide a reliable complete code-search result for imports | Medium | Do not remove; run local AST/text import scan before deciding |
| `package.json` | `pdf-lib` | Declared dependency; invoice feature exists, but complete import trace was not established in this connector pass | High | Keep until invoice generation import graph is verified |
| `package.json` | `@pdf-lib/fontkit` | Declared alongside PDF generation dependencies | High | Keep until invoice/PDF import graph is verified |
| `package.json` | `qrcode` | Declared dependency; invoice/QR functionality exists in project context | High | Keep until complete import graph is verified |
| `package.json` | `regenerator-runtime` | Declared dependency; no reliable complete import trace from connector search | Medium | Do not remove without local dependency analysis |
| storefront service | `PRODUCT_SELECT` fields | Used by homepage, catalogue and product-detail data paths | High | Not dead code; optimize by consumer-specific projection rather than removal |
| `getFeaturedProducts()` | exported helper | Existing service API; usage needs complete repository reference scan | Medium | Verify references before considering removal |
| `getStorefrontBanners()` | exported helper | Existing service API; homepage currently uses `getHomepageData()` | Medium | Verify all references before removal |
| `getPublicSitemapEntries()` | sitemap data helper | Likely route infrastructure; cannot safely infer unused status | High | Keep until all route references are verified |

## Duplicate-code observations

The storefront service contains multiple product-loading entry points:

- `getHomepageData()`
- `getProducts()`
- `getProductById()`
- `getProductBySlug()`
- `getFeaturedProducts()`
- `getRelatedProducts()`

This is not automatically dead or duplicate functionality. Several are consumer-specific. The correct next step is reference and payload analysis, not deletion.

## No automatic cleanup

Because the requested Section 1 rule is evidence-first cleanup, the report deliberately contains **no deletion commit**.
