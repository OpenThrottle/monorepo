# @openthrottle/react-router-utils

Shared config, environment, logging, and metadata utilities for OpenThrottle React Router applications.

## Route action & fetcher helpers

`getActionError`, `isActionFailure`, `isActionSuccess`, `isFetcherBusy`, and `isFetcherFormPending`
narrow the JSON a route `action` returns to `useFetcher` / `useActionData` — the conventional
`{ error }` / `{ ok, error }` envelope. They are **not** GraphQL parsers: `{ data, errors }`
unwrapping lives in `@openthrottle/react-router-graphql`. See
`applications/openthrottle-developer/app/routes/skills.$slug.tsx` for the reference usage.

## URL pagination parsing

`parsePagination(searchParams, options)` is the one place `?page=` / `?limit=` are parsed. It returns
`{ limit, offset, page }` with `offset = (page - 1) * limit`. Missing, empty, non-finite, or
below-one values fall back to `defaultPage` / `defaultLimit` (defaulting to `DEFAULT_PAGINATION_PAGE`
and `DEFAULT_PAGINATION_LIMIT`); otherwise the value is floored, and `limit` is clamped into
`[minLimit, maxLimit]` when those options are set (`minLimit` defaults to `1`, `maxLimit` to no cap).
`page` is never upper-clamped — that needs `totalPages`, so callers do it once they know the count.

```ts
const { limit, offset, page } = parsePagination(url.searchParams, {
  defaultLimit: REPOSITORIES_DEFAULT_LIMIT,
  maxLimit: 100,
});
```

`parsePaginationPage(raw, defaultPage?)` and `parsePaginationLimit(raw, options?)` are the
primitives, for client-side pagers that hold a raw string rather than a `URLSearchParams`.

## Installation

**In this monorepo:** add `"@openthrottle/react-router-utils": "workspace:^"` to the consuming package’s `package.json`, then run `pnpm install` from the repository root.

> [!Tip]
> This package is **private** to the workspace and is not published to a public registry.
