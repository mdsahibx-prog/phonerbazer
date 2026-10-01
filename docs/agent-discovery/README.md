# Portable Agent Discoverability

This directory contains the public `llms.txt` pattern used by the site plus a reusable template for future projects.

## Design goals

- Keep `/llms.txt` small, static, link-rich, and fast to serve.
- Keep `/llms-full.txt` as optional extended public context.
- Never require a database query, API call, authentication session, or client-side JavaScript to answer an agent-discovery request.
- Keep product price, stock, variants, delivery, promotions, and policy claims tied to the live authoritative public pages.
- Keep private customer, order, account, payment, authentication, administration, analytics, and security data out of agent-facing resources.
- Make the same pattern portable to another ecommerce or content project.

## Reuse procedure

Copy `LLMS-TEMPLATE.md` into the target project and replace the `{{...}}` placeholders with that project's canonical public values.

The target project should publish:

- `/llms.txt` — concise discovery index.
- `/llms-full.txt` — optional extended agent guide.
- `/sitemap.xml` — machine-readable public URL discovery.
- `/robots.txt` — crawler access policy.

## Portable template mapping

| Placeholder | Replace with |
| --- | --- |
| `{{SITE_NAME}}` | Public brand/site name |
| `{{SITE_URL}}` | Canonical public origin, including scheme |
| `{{SITE_DESCRIPTION}}` | One-sentence public description |
| `{{PRODUCTS_URL}}` | Public catalogue/products URL |
| `{{BRANDS_URL}}` | Public brands URL, when applicable |
| `{{CATEGORIES_URL}}` | Public categories URL, when applicable |
| `{{SITEMAP_URL}}` | Public sitemap URL |
| `{{ROBOTS_URL}}` | Public robots URL |
| `{{SHIPPING_URL}}` | Shipping policy URL |
| `{{WARRANTY_URL}}` | Warranty policy URL, when applicable |
| `{{RETURNS_URL}}` | Returns policy URL, when applicable |
| `{{PRIVACY_URL}}` | Privacy policy URL |
| `{{TERMS_URL}}` | Terms URL |
| `{{CONTACT_URL}}` | Public contact URL |
| `{{HELP_URL}}` | Public help URL, when applicable |

## Production rule

Treat the files under `public/` as deploy-time public outputs. Do not add runtime generation or per-request data fetching just to build `llms.txt`; that would add latency and another failure surface to the storefront.

When the business identity or public URL structure changes, update the static files and this template together in the same release.


## WebMCP and ARD

The public agent layer now also supports WebMCP form discovery on safe browser workflows and publishes the current ARD manifest at `/.well-known/ard.json`. The legacy `/.well-known/ai-catalog.json` manifest is retained for compatibility with older consumers.

The site deliberately does not expose autonomous final checkout/order submission as a WebMCP tool. Order creation, payment, stock reservation, and related commerce controls remain behind the existing application flow and server-side validation.

Responsive header search forms use distinct tool names because both desktop and mobile forms exist in the same DOM. They represent the same public read-only capability in two responsive UI contexts.

