# @openthrottle/react-router-utils

Shared config, environment, logging, and metadata utilities for OpenThrottle React Router applications.

## Route action & fetcher helpers

`getActionError`, `isActionFailure`, `isActionSuccess`, `isFetcherBusy`, and `isFetcherFormPending`
narrow the JSON a route `action` returns to `useFetcher` / `useActionData` — the conventional
`{ error }` / `{ ok, error }` envelope. They are **not** GraphQL parsers: `{ data, errors }`
unwrapping lives in `@openthrottle/react-router-graphql`. See
`applications/openthrottle-developer/app/routes/skills.$slug.tsx` for the reference usage.

## Installation

**In this monorepo:** add `"@openthrottle/react-router-utils": "workspace:^"` to the consuming package’s `package.json`, then run `pnpm install` from the repository root.

> [!Tip]
> This package is **private** to the workspace and is not published to a public registry.
