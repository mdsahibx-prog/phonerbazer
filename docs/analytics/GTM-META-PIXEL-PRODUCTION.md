# GTM + Meta Pixel Production Ownership and Verification

## Current production architecture

- The application code owns the browser Meta Pixel integration in `lib/analytics/browser-registry.ts`.
- The app initializes configured Meta Pixel IDs with automatic configuration disabled, disables automatic History API PageViews, maps canonical events to Meta standard events, and uses `trackSingle` with an `eventID`.
- The web GTM container (`GTM-T3QQN9RR`) is dynamically loaded only after a visitor grants marketing consent. The app pushes canonical commerce events to `dataLayer`.
- GA4 also has a server-side Measurement Protocol path. A GA4 event tag in GTM for the same canonical events can cause duplicate GA4 events unless ownership is explicitly configured.
- Meta CAPI and server-side GTM are currently disabled in the saved analytics configuration.

## Non-negotiable rule: one event owner per destination

Do not fire the same Meta Pixel event from both the app's `fbq/trackSingle` integration and a Meta Pixel tag in GTM. That can create duplicate PageView, ViewContent, AddToCart, InitiateCheckout, or Purchase events. Deduplication should not be used as a substitute for avoiding duplicate browser sends.

**Safe current mode:** keep the application-owned Meta Pixel enabled and use GTM for only those other destinations/events intentionally assigned to GTM. Remove/disable Meta Pixel tags in GTM that target either configured Pixel ID while this mode is active. Check Meta Event Setup Tool rules separately; they can create events outside the application mapping.

**Alternative GTM-owned Meta mode:** only migrate after the GTM container has been inspected and Preview-tested. Disable the app-owned Meta Pixel dispatch as part of the same planned change; use the official Meta Pixel tag template, disable its automatic configuration and automatic history tracking, and map the canonical `dataLayer` event names explicitly. Do not run both modes simultaneously.

## Required consent configuration

- Keep the app's marketing-consent gate. Do not bypass visitor choices or ad blockers.
- In GTM, configure consent settings for every marketing tag and verify the current consent state before its trigger fires.
- Use GTM's Consent Initialization trigger for tags/templates that set default consent; do not implement a late asynchronous default.
- After a visitor changes consent, verify the updated consent state and that marketing tags no longer dispatch events without the required consent.

## Event contract

| Canonical app event | Meta standard event | Data rule |
| --- | --- | --- |
| `page_view` | `PageView` | Public routes only; one view per route |
| `view_item` | `ViewContent` | Product ID, BDT value/currency where available |
| `add_to_cart` | `AddToCart` | Fire after the cart server accepts the mutation |
| `begin_checkout` | `InitiateCheckout` | Actual checkout start |
| confirmed `purchase` | `Purchase` | Successful order only; stable order event ID |

The browser ingestion API deliberately rejects client-originated `purchase` and order/payment lifecycle events. Do not create a GTM click-based Purchase trigger.

## Mandatory release test (GTM Preview + Meta Test Events)

1. Open GTM > Preview and connect `https://www.phonerbazar.store`. Save a screenshot/export of all tags fired on the initial page and on the product, Add to Cart, checkout, and order-complete flows.
2. With no marketing consent, verify the GTM container and Meta requests do not load/send marketing events.
3. After granting marketing consent, verify one intended PageView, ViewContent, and AddToCart request per app action for Pixel `2040714466673633`; verify the right product ID and `BDT` currency/value.
4. Confirm no second Meta tag fires the same event. Investigate `SubscribedButtonClick` from GTM tags and Meta Event Setup Tool if it reappears.
5. In Meta Events Manager > Test Events, confirm browser events reach the exact same Pixel data source. Pixel Helper alone only establishes that the browser detected a pixel/event, not that Meta Events Manager received it.
6. Test a genuine completed order in a controlled low-risk process and ensure only one Purchase is received. Do not create fake/repeated customer orders just to trigger tracking.
7. After all tests pass, publish a named GTM container version and keep the previous version available for rollback.

## Official references

- Google Tag Manager consent support: https://support.google.com/tagmanager/answer/10718549
- Google Tag Manager Preview and debugging: https://support.google.com/tagmanager/answer/6107056
- Google Tag Manager data layer: https://support.google.com/tagmanager/answer/13352957
- Meta's official GTM Pixel template (supports explicit automatic-configuration/history controls): https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel
- Meta's official GTM Pixel template source: https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel/blob/main/template.tpl
