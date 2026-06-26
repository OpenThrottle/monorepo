# @openthrottle/nestjs-utils

DataLoader helpers for NestJS GraphQL resolvers and shared HTTP header constants. This package does **not** ship NestJS decorators, pipes, or filters — only the two pieces below.

## Installation

Install with your preferred package manager:

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-utils
```

**npm:**

```bash
npm install @openthrottle/nestjs-utils
```

## HTTP header constants

Shared header names for propagating the calling application's identity across services:

| Constant             | Header value    |
| -------------------- | --------------- |
| `HEADER_APP_NAME`    | `x-app-name`    |
| `HEADER_APP_VERSION` | `x-app-version` |

```ts
import {
  HEADER_APP_NAME,
  HEADER_APP_VERSION,
} from '@openthrottle/nestjs-utils';

const headers = {
  [HEADER_APP_NAME]: 'openthrottle-server',
  [HEADER_APP_VERSION]: '2.2.25',
};
```

## DataLoader helpers

Factory helpers for per-request [DataLoader](https://github.com/graphql/dataloader)
instances (batching + per-instance cache). Create one loader per GraphQL request
(e.g. a request-scoped Nest provider) to avoid cross-request cache leakage.

### `createDataLoader`

Wraps a batch function that returns one value per key (use `null` for missing
keys) and must preserve the order and length of the input keys.

```ts
import { createDataLoader } from '@openthrottle/nestjs-utils';

const userLoader = createDataLoader<string, User>(async (ids) => {
  const users = await userRepository.findByIds(ids);
  const byId = new Map(users.map((u) => [u.id, u]));
  return ids.map((id) => byId.get(id) ?? null);
});

const user = await userLoader.load('user-1'); // User | null
```

### `createLoaderFromFindByIds`

Builds a loader from a `findByIds`-style function. Multiple `load(id)` calls are
batched into one `findByIds(ids)` call and the results are mapped back to key
order. When the entity is keyed by a plain `id` field, no options are needed:

```ts
import { createLoaderFromFindByIds } from '@openthrottle/nestjs-utils';

const userLoader = createLoaderFromFindByIds<string, User>((ids) =>
  userRepository.findByIds(ids),
);
```

For entities keyed by anything other than `id`, pass `keyFn` (required by the
type signature so a missing key can never be silently mapped to `null`):

```ts
const accountLoader = createLoaderFromFindByIds<string, Account>(
  (keys) => accountRepository.findByExternalIds(keys),
  { keyFn: (account) => account.externalId },
);
```
