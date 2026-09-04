# @openthrottle/graphql-codegen

Centralizes GraphQL Codegen dependencies for the OpenThrottle monorepo (`client` preset and `typescript-validation-schema` plugin). Apps and packages run `graphql-codegen` from their own `codegen.ts` files; this package hoists the shared toolchain version.

## Installation

Workspace packages depend on this package via the root `package.json` or a direct `workspace:^` reference. Do not add individual `@graphql-codegen/*` packages to consumers unless a config needs a plugin outside the shared set.

```bash
pnpm add @openthrottle/graphql-codegen@workspace:^
```

## Usage

Import the config type when authoring `codegen.ts`:

```ts
import type { CodegenConfig } from '@openthrottle/graphql-codegen';
```

Run codegen from a project that defines `codegen.ts`:

```bash
pnpm nx run <project>:codegen-graphql
```

## Convention: type UI entity props from generated fragment types

A named fragment is the source of truth for an entity's shape. Components, hooks,
utils and test fixtures take that entity as the generated `XxxFragment` type —
always via `import type` from `~/__generated__/graphql`, never a value import.

```graphql
# applications/openthrottle-admin/app/routes/roles.$roleId.tsx.graphql
fragment RoleDetails on RoleObject { … }

query getRole($id: ID!) {
  role(id: $id) {
    ...RoleDetails
  }
}
```

```ts
// ✅ typed from the document
import type { RoleDetailsFragment } from '~/__generated__/graphql';

export interface RoleDetailCardProps {
  role: RoleDetailsFragment;
}
```

```ts
// ❌ do not unwrap a route module's loader data
type RoleDetail = NonNullable<Route.ComponentProps['loaderData']['role']>;

// ❌ and do not unwrap the query result either
type RoleDetail = NonNullable<GetRoleQuery['role']>;
```

Unwrapping couples a reusable card/sheet/hook to one route's `+types`, and
duplicates a type codegen already emitted. Both `NonNullable` forms exist only
because the query root field is nullable — and that nullability belongs at the
**route boundary**, not on every child prop.

### Where each type still applies

- **Route modules** may `NonNullable` (or throw a 404) to assert the entity
  exists, then pass the narrowed value into children typed as the fragment.
- **Whole-loader bags** (`loaderData.permissions`, pagination cursors, tag
  vocabularies) legitimately keep `Route.ComponentProps['loaderData']` — that is
  route composition, not an entity shape.
- **`NonNullable<ReturnType<typeof useRouteLoaderData<typeof loader>>>`**
  asserts the _route_ has run. Leave it alone.
- Non-GraphQL unwraps (`BadgeProps['color']`, `DynamicModule['imports']`) are
  unrelated to this convention.

### No fragment yet?

Extract one first, spread it from the query (and from any mutation selecting the
same field set), re-run `pnpm nx run <app>:codegen-graphql`, then consume the
generated type. Queries and mutations should spread `...RoleDetails` rather than
inlining the same fields twice.

Nothing to configure: `defineCodegen` already sets **`fragmentMasking: false`**,
so fragment types are emitted unmasked and are directly usable as props.

## Zod validation schemas

`defineCodegen` emits a Zod block (`typescript-validation-schema`) alongside the
`client` preset — `<outputDir>schemas.ts` — with one `FooInputSchema()` function
per GraphQL **input type**. Two knobs are intentional:

- **`notAllowEmptyString: true`** — required (non-null) string inputs are
  emitted as `z.string().min(1)`, so an empty value fails validation. Nullable
  and optional fields are unaffected. Changing this regenerates every consumer
  (`developer`, `admin`, `email`, `openthrottle-mcp`, `agentic-ralph`), so treat
  it as a compatibility change, not a silent flip. (The `codegen-graphql` cache
  key does not include this package's source — pass `--skip-nx-cache` when a
  `defineCodegen` change must re-emit `schemas.ts`.)
- **`zodImportPath: 'zod/v3'`** — kept on the `zod/v3` compat subpath even though
  the catalog ships zod v4. Migrating the generated schemas to the native v4 API
  is a separate cross-consumer effort.

### Convention: parse route-action `FormData` through the generated schema

New mutations get a `.graphql` document; codegen emits the input schema; route
actions validate `FormData` through **`parseFormData`** from
`@openthrottle/react-router-graphql` + the generated schema. Do **not** add new
per-field `formData.get` + `typeof === 'string'` + `.trim()` + empty-check
helpers.

```ts
import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { AddSkillTagInputSchema } from '~/__generated__/schemas';

const parsed = parseFormData(formData, AddSkillTagInputSchema());
if (!parsed.success) return { error: parsed.error }; // already humanized — surface it
await executeGraphqlWithAuth(request, AddSkillTagDocument, {
  input: parsed.data,
});
```

- **Messages are humanized centrally — surface `parsed.error` directly.** The
  generated `.min(1)` fields carry no message, so `parseFormData` fills them via
  a shared Zod `errorMap`: a missing/blank required field → "{Label} is
  required.", a bad enum → "{Label} must be one of: …", where `{Label}` is the
  field path in sentence case (`startIso` → "Start iso"). Return `parsed.error`
  instead of hard-coding per-field copy. Override per call when the default
  reads poorly — `{ labels: { gitUrl: 'Git repository URL' } }` (swap the label)
  or `{ messages: { path: '…' } }` (replace the whole message), keyed by
  dot-joined path. A schema's own `.refine`/`.min(N, 'msg')` message is never
  overridden. Direct `safeParse` callers (loaders, MCP tools) get the same copy
  via the exported `zodErrorMap` / `formatZodError`.

- **Flatten vs `input` wrapping:** the util builds a plain object from the form.
  Mutations that take a single `input:` argument wrap the result
  (`{ input: parsed.data }`); dot/bracket form keys (`input.tag`, `input[tag]`)
  build a nested object directly. For a mutation whose variables are **not** a
  single input (e.g. `$ruleId`, `$posture`), pass a small composed
  `z.object({ … })` and pass the fields straight as variables. When some
  variables come from route params (a `planId`/`taskId`), `.omit()` them from the
  generated schema, validate only the form fields, then assemble the full input.
- **Form-only extras:** the `intent` dispatch field is dropped by default; add
  more via `{ allow: ['intent', 'csrf'] }`. Any other key that is neither on the
  schema nor allow-listed fails strict — pass `{ strict: false }` when the form
  legitimately carries fields the schema does not (e.g. a shared authoring form).
- **Non-string fields (booleans, numbers, JSON):** `parseFormData` is
  string-centric, so wrap the non-string fields of a generated schema with the
  coercion helpers (also from `@openthrottle/react-router-graphql`) inside
  `.extend()` instead of reintroducing `formData.get(...) === 'true'` /
  `Number(...)` at the call site:

  ```ts
  import {
    coerceBoolean,
    coerceJson,
    coerceNumber,
    isJsonString,
    parseFormData,
  } from '@openthrottle/react-router-graphql';

  const parsed = parseFormData(
    formData,
    EnqueuePlanRunInputSchema().extend({
      priority: coerceNumber(z.number().int().nullish()),
    }),
  );
  ```

  - `coerceBoolean(schema)` — checkbox / `'true'|'false'|'on'` → boolean; blank or
    absent → `undefined` so the wrapped `.default()`/`.nullish()` decides.
  - `coerceNumber(schema)` — numeric string → number; a non-numeric string is
    passed through so the schema rejects it rather than sending `NaN`.
  - `coerceJson(schema)` — a hidden field holding an object as JSON is
    `JSON.parse`d and validated against the wrapped (usually nested, generated)
    schema. **Only** for fields that become objects.
  - Fields that stay a JSON **string** on the wire (`runConfigJson`,
    `jobRunHooksJson`) keep the generated `z.string()`; add
    `.refine(isJsonString, 'Must be valid JSON.')` for an early validity check.
  - **Files** (`plans.upload-decompose`) stay a special case: a `File` value is
    dropped by the parser, so keep reading it from `formData` directly.

- **Action-result envelopes:** `parseFormData` shapes the request side; for the
  response side, normalize on `ActionResult` and read it with `getActionError` /
  `isActionSuccess` / `isActionFailure` from `@openthrottle/react-router-utils`
  rather than hand-checking result keys. The two are orthogonal — adopt the
  envelope helpers only when a task explicitly normalizes a result shape.

### Intentional exceptions (do NOT force onto `parseFormData`)

These form submissions are deliberately left hand-parsed because they do not map
to a generated GraphQL `*InputSchema()`. Do not add parallel trim helpers for
them, and do not treat them as un-migrated debt:

- **Auth login** — `root.tsx` / `auth._index.tsx` (developer) and `root.tsx`
  (admin). Credentials are posted to the auth layer, not a GraphQL Input type.
- **Command palette / search jump** — `root.tsx`. UI navigation, not a mutation.
- **Filesystem skill write** — `skills.$slug.tsx` writes to local disk, not
  GraphQL.
- **File upload** — `plans.upload-decompose`. `parseFormData` drops `File`
  values (see above); read the upload from `formData` directly.
- **`resources.agent-*` resource routes** — small boolean/string toggles; adopt
  `parseFormData` only where a matching generated Input schema already exists.
- **`@openthrottle/react-router-chat` conversation stream** — the shared chat
  package feeds `AgentsRunChatTurnInputSchema` after its own reads
  (`utils.agents-chat.ts`); migrating it is a separate follow-up in that package,
  not an app-action change.

### Deferred (out of scope — do not start from this convention)

- Client-side React Hook Form / shadcn field binding.
- Native zod v4 (the schemas run on the `zod/v3` compatibility path).
- Operation-variable codegen (generating schemas for non-`input:` mutation
  variables); until then, use a small composed `z.object` for those — see the
  flatten-vs-`input` note above. Tracked as a later optional plan.
