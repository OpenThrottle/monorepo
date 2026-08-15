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
if (!parsed.success) return { error: parsed.error }; // or a friendly per-action message
await executeGraphqlWithAuth(request, AddSkillTagDocument, {
  input: parsed.data,
});
```

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
