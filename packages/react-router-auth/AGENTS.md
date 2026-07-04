# @openthrottle/react-router-auth — agent notes

HTTP-only auth cookie helpers (`Set-Cookie` builders, token read, clear header) plus a server-side
`authMiddleware` for React Router apps. No JWT decoding/validation, no auth forms.

**Consumed by:** `openthrottle-developer` (declared). `@openthrottle/react-router-graphql` also
imports `getAuthTokenFromCookie` without declaring the dependency — see that package's notes.

## Layout

- [src/index.ts](src/index.ts) — exports `config` + `utils` + `middleware` (components/data/hooks exports are commented out; those dirs hold only tests).
- [src/utils/index.ts](src/utils/index.ts) — `buildAuthCookie` / `getAuthTokenFromCookie` / `getClearAuthCookieHeader` and `AuthCookieOptions`.
- [src/utils/middleware.ts](src/utils/middleware.ts) — `authMiddleware` (React Router `MiddlewareFunction`).
- [src/config/index.ts](src/config/index.ts) — cookie name/path/SameSite/max-age constants.

## Invariants & gotchas

- Source-first, no build target (`__build`/`__build-package` placeholders) — see [packages/AGENTS.md](../AGENTS.md).
- `AUTH_COOKIE_NAME` is `` `${APP_NAME}_auth_token` `` resolved **at module evaluation** from `window.env.APP_NAME` (client) or `process.env.APP_NAME` (server), falling back to `''` — the cookie name differs per app, and code loaded before `window.env` exists gets the fallback.
- `buildAuthCookie` interpolates the token verbatim (no percent-encoding). The contract is a server-issued JWT; a value containing `;`, `,`, or whitespace silently corrupts the header.
- `Secure` is omitted whenever `NODE_ENV !== 'production'` (or `insecureCookies: true`). Clearing only works if `getClearAuthCookieHeader` gets the same `AuthCookieOptions` (path/SameSite) used when setting.
- `authMiddleware` hardcodes `PUBLIC_ROUTE_PREFIXES` (`/about`, `/auth`, `/legal`) and `BETA_ROUTE_PREFIXES` gated by `FEATURE_BETA_PREVIEW === 'true'`, and redirects to `/auth` / `/dashboard` — it is shaped around the developer app's route map; other apps need those prefixes to match.
- Consumer-side trap this package cannot fix: a login action that sets the cookie and returns data triggers post-action revalidation — the route loader then sees the token and redirects instantly, cutting off client exit animations. Consumers opt out with `shouldRevalidate: () => false` on the auth route (see [applications/openthrottle-developer/app/routes/auth.\_index.tsx](../../applications/openthrottle-developer/app/routes/auth._index.tsx)).

## Pointers

- [README.md](README.md) — API surface and non-goals.
