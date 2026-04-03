# @openthrottle/nodejs-graphql

Fetch-based GraphQL client for React Router loaders and actions against openthrottle-server, using `TypedDocumentNode` from codegen.

## V1 vs V2

|              | **V1** (`executeGraphql`, `executeGraphqlAtUrl`, `executeGraphqlWithAuth`)                                                                                | **V2** (`executeGraphql_v2`)                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **URL**      | From env (`executeGraphql` / `executeGraphqlWithAuth` via `getGraphQLUrl()` → `API_URL_INTERNAL` + `/graphql`) or caller-supplied (`executeGraphqlAtUrl`) | Always caller-supplied `options.url` (no env read inside V2)                                                               |
| **Errors**   | Throws on non-OK HTTP, GraphQL `errors`, or missing `data`                                                                                                | Non-throwing `GraphqlV2Result`: `ok: true` with `data`, or `ok: false` with structured `error`                             |
| **Auth**     | Headers on V1 options, or `executeGraphqlWithAuth(token, …)`                                                                                              | `options.token` (Bearer) and/or `options.headers`; Bearer wins over `Authorization` in `headers` when `token` is non-empty |
| **Fetch**    | Global `fetch` only                                                                                                                                       | `options.signal`, `options.fetch`, `options.requestInit` (see types)                                                       |
| **DateTime** | Always runs `parseDateTimeInResponse` on success                                                                                                          | Default same as V1; set `parseDateTime: false` for raw `data`                                                              |

**Use V1** when a loader or script should fail fast with thrown `Error` and you are fine resolving the server URL from `API_URL_INTERNAL` (or you already call `executeGraphqlAtUrl` with an explicit URL).

**Use V2** when you need explicit URL/token without env inside the client, cancellation (`signal`), injectable `fetch`, or structured errors (map with `mapFailure`, or branch on `result.ok`). CLI tools, workflows, and tests often fit V2 better.

**Workflows:** `@openthrottle/openthrottle-workflows` exposes `executeWorkflowGraphql` and config helpers that delegate to `executeGraphql_v2` with workflow-specific error mapping—prefer that package for Ralph/workflow GraphQL rather than calling V2 directly.

## Environment (V1 URL)

`getGraphQLUrl()` and therefore `executeGraphql` / `executeGraphqlWithAuth` require **`API_URL_INTERNAL`** (base URL without trailing `/graphql`; the helper appends `/graphql`). If unset, `getGraphQLUrl()` throws.

## Examples

### V1: Remix loader with Bearer token

```ts
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import type { Route } from './+types/some-route';
import { SomeQueryDocument } from './graphql/generated';

export async function loader({ request }: Route.LoaderArgs) {
  const token = await getSessionToken(request); // your auth helper
  const data = await executeGraphqlWithAuth(token, SomeQueryDocument, {
    id: '…',
  });
  return { data };
}
```

### V2: Remix loader with explicit URL and structured errors

```ts
import { executeGraphql_v2, getGraphQLUrl } from '@openthrottle/nodejs-graphql';
import type { Route } from './+types/some-route';
import { SomeQueryDocument } from './graphql/generated';

export async function loader({ request }: Route.LoaderArgs) {
  const token = await getSessionToken(request);
  const result = await executeGraphql_v2(
    SomeQueryDocument,
    { id: '…' },
    {
      url: getGraphQLUrl(),
      token,
      signal: request.signal,
    },
  );

  if (!result.ok) {
    throw new Response(result.error.message, {
      status: result.error.httpStatus ?? 500,
    });
  }

  return { data: result.data };
}
```

### V2: Custom failure shape (`mapFailure`)

```ts
import type { GraphqlV2FailureContext } from '@openthrottle/nodejs-graphql';
import { executeGraphql_v2 } from '@openthrottle/nodejs-graphql';

interface AppGraphqlError {
  readonly code: string;
  readonly message: string;
}

const mapFailure = (ctx: GraphqlV2FailureContext): AppGraphqlError => ({
  code: ctx.failure.kind,
  message: ctx.failure.message,
});

const result = await executeGraphql_v2(MyDocument, undefined, {
  url: 'https://example.com/graphql',
  mapFailure,
});

if (!result.ok) {
  console.error(result.error.code, result.error.message);
}
```

## Exports and tree-shaking

The package exposes a single main entry (`@openthrottle/nodejs-graphql`). Use **named imports** so bundlers can drop unused symbols:

```ts
import { executeGraphql_v2 } from '@openthrottle/nodejs-graphql';
```

**Functions:** `executeGraphql`, `executeGraphqlAtUrl`, `executeGraphqlWithAuth`, `executeGraphql_v2`, `getGraphQLUrl`, `parseDateTimeInResponse`.

**Types:** `ExecuteGraphqlV2`, `ExecuteGraphqlAtUrlOptions`, `ExecuteGraphqlOptions`, `GraphqlResponse`, `GraphqlV2ErrResult`, `GraphqlV2ExecuteOptions`, `GraphqlV2Failure`, `GraphqlV2FailureContext`, `GraphqlV2FailureKind`, `GraphqlV2GraphqlErrorItem`, `GraphqlV2MapFailure`, `GraphqlV2OkResult`, `GraphqlV2ResponsePayload`, `GraphqlV2Result`.

Import from `@openthrottle/nodejs-graphql` only; there is no supported deep import path for production consumers.

## Build (monorepo)

```bash
pnpm nx run @openthrottle/nodejs-graphql:build
```

Watch mode: `pnpm nx run @openthrottle/nodejs-graphql:__dev`.

## Installation

**In this monorepo:** add `"@openthrottle/nodejs-graphql": "workspace:*"` to the consuming package’s `package.json`, then run `pnpm install` from the repository root.

This package is **private** to the workspace and is not published to the public registry.
