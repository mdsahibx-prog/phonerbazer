# Technology Footprint Hardening

This change reduces obvious framework markers; it is not a guarantee that a technology profiler cannot identify the stack. Browser JavaScript, request behavior, asset paths, and public API destinations can still identify a framework or backend.

## Application-side changes

- `poweredByHeader: false` disables Next.js' `X-Powered-By` header.
- Production browser source maps remain disabled.
- The `Server: webserver` response header is configured as a best-effort override. Vercel or an intermediary may replace it; verify the actual deployed response.
- Framework generator metadata is explicitly unset. The default `next.svg` and `vercel.svg` assets have been removed.
- Browser auth storage and Supabase SSR cookies use `_pb_sess`. Existing browser sessions and legacy SSR cookies are migrated when the corresponding client next runs. Stateless `lib/supabase/public.ts` intentionally has no persistent session storage or cookie configuration.
- `site.webmanifest` contains only app branding and relative icon paths. `app/robots.ts` has crawl rules for the site's public and restricted route groups, but robots rules are public and are not an authorization mechanism.

## Cloudflare: strip Vercel response headers

Cloudflare must proxy the production DNS record (orange-cloud enabled); Transform Rules do not affect requests that bypass Cloudflare.

1. Open **Cloudflare Dashboard → your zone → Rules → Transform Rules → Response Header Transform Rules**.
2. Create a rule named **Remove hosting diagnostic headers**.
3. Use this expression for the production hostnames:

   ```text
   (http.host eq "www.phonerbazar.store") or (http.host eq "phonerbazar.store")
   ```

   Adjust the hostnames if the production domain changes.
4. Add **Remove** response-header actions for each of these headers:
   - `x-vercel-id`
   - `x-vercel-cache`
   - `x-matched-path`
5. Deploy the rule, then verify the public response using browser DevTools or `curl -sSI https://www.phonerbazar.store/`. Repeat for representative page and API endpoints.

Cloudflare's current Response Header Transform Rules documentation says the `Server` header cannot be modified through these rules. Therefore, the application-side `Server: webserver` value may not survive the hosting/CDN response path. Do not claim the server identity is hidden unless the actual public response has been checked. Also check the deployment directly, if a public Vercel deployment alias remains reachable, because direct-origin requests bypass Cloudflare's rules.

## Verification checklist

- [ ] Run lint, production build, and existing checkout/auth contract tests.
- [ ] Verify admin sign-in, sign-out, password reset, invitation activation, and an authenticated server action.
- [ ] Confirm `X-Powered-By` and generator metadata are absent from production HTML/headers.
- [ ] Confirm no public references remain to `/next.svg` or `/vercel.svg`.
- [ ] Confirm the three Vercel diagnostic headers are absent through Cloudflare.
- [ ] Confirm payment webhooks and all admin/API routes remain reachable and retain their existing authentication and response behavior.

Removing framework markers is obscurity, not a security boundary. Keep authorization, payment validation, secrets, and database access protected independently of these changes.
