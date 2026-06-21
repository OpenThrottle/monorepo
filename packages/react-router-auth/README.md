# @openthrottle/react-router-auth

HTTP-only auth cookie helpers for React Router apps: `Set-Cookie` builders, reading the auth token from a `Cookie` header, and a session-clear header.

## API

- `buildAuthCookie(token, options?)` — builds a `Set-Cookie` header value that stores the auth token (`HttpOnly`, `SameSite=Lax`, `Secure` unless `insecureCookies` is set or outside production).
- `getAuthTokenFromCookie(cookieHeader)` — returns the raw auth token string from a `Cookie` header value, or `null` if absent.
- `getClearAuthCookieHeader(options?)` — returns a `Set-Cookie` header value that clears the auth cookie (same attributes, `Max-Age=0`).
- `AUTH_COOKIE_NAME`, `AUTH_COOKIE_MAX_AGE_DAYS` — cookie name (derived from `APP_NAME`) and max-age constants.

This package does not decode or validate JWTs, render auth forms, or define an error/`Unauthorized` contract.

## Installation

**In this monorepo:** add `"@openthrottle/react-router-auth": "workspace:^"` to the consuming package’s `package.json`, then run `pnpm install` from the repository root.

> [!Tip]
> This package is **private** to the workspace and is not published to a public registry.
