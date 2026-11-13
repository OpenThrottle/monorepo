# Code style

How we write TypeScript in this repo: the **rationale and the examples**. The
normative one-liners live in [AGENTS.md](../../AGENTS.md) § Code style, which every
agent loads on every turn. This document is what you open when the one-liner is not
enough — why the rule exists, what the good and bad shapes look like, and whether a
machine will catch you.

It replaces the retired per-editor `.mdc` rules tree. Nothing normative was dropped in the
move; a few statements were **corrected**, and those corrections are called out inline
rather than transcribed.

## How to read the enforcement labels

Every section carries one of three labels. A guide that reads as if all conventions are
equally policed is misleading — most of the value here is knowing which ones only work
if a human or an agent remembers them.

| Label            | Meaning                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Enforced**     | ESLint `error` or a compiler flag. CI fails. You cannot merge past it.                                                                                                               |
| **Warned**       | ESLint `warn`. Nothing blocks — the lint targets pass no `--max-warnings`. The consumer is the weekly [`Job_RulesConformance`](../../.agents/prompts/Job_RulesConformance.md) sweep. |
| **Honor system** | No machine check exists. Holds only because it is in context and reviewed.                                                                                                           |

The gate is `pnpm nx run-many --target=lint --all`, not an ad-hoc `pnpm exec eslint`
sweep — the latter picks up generated and build output (`storybook-static/`,
`__generated__/`, `dist/`) that the real targets ignore, so any count it gives you is an
upper bound, not the number CI sees.

ESLint config: [`tools/dotfiles/src/index.ts`](../../tools/dotfiles/src/index.ts).
Compiler flags: [`tsconfig.base.json`](../../tsconfig.base.json).

## Enforcement at a glance

Every convention inherited from the retired rules tree — 15 of the 16 relocated, with
`any-inside-generic-functions` retired outright (see
[Corrections](#corrections-made-in-the-move)) — plus the rules that were already enforced by
lint but never had a rule file of their own:

| Convention                                                                  | Enforcement                            | Mechanism                                                             |
| --------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| [No new enums](#no-new-enums)                                               | **Enforced**                           | `no-restricted-syntax` → `TSEnumDeclaration`                          |
| [Component and data boundaries](#component-and-data-boundaries)             | **Enforced**                           | `openthrottle/component-primitive-shape` + `audit:component-shape`    |
| [No default exports](#no-default-exports)                                   | **Enforced**                           | `import-x/no-default-export`                                          |
| [`import type`](#import-type)                                               | **Enforced**                           | `@typescript-eslint/consistent-type-imports`                          |
| [Naming conventions](#naming-conventions)                                   | **Enforced** (file names honor system) | `@typescript-eslint/naming-convention`                                |
| [NestJS file names](#nestjs-file-names)                                     | **Enforced**                           | `openthrottle/nestjs-file-naming`, `openthrottle/nestjs-file-exports` |
| [Indexed access is `\| undefined`](#indexed-access-returns-undefined)       | **Enforced**                           | `noUncheckedIndexedAccess` compiler flag                              |
| [No `as` casts](#no-as-casts)                                               | **Enforced**                           | `consistent-type-assertions`, `assertionStyle: 'never'`               |
| [No `any`](#no-any)                                                         | **Enforced**                           | `@typescript-eslint/no-explicit-any`                                  |
| [Alphabetize keys](#alphabetize-arrays-and-object-keys)                     | **Enforced**                           | `sort-keys`, `perfectionist/*`, `@graphql-eslint/alphabetize`         |
| [File length caps](#file-length-caps)                                       | **Enforced**                           | `max-lines` (210 components / 210 routes)                             |
| [No `await` in loops](#no-await-in-loops)                                   | **Enforced**                           | `no-await-in-loop`                                                    |
| [Composing classes with `cn`](#composing-classes-with-cn)                   | **Enforced**                           | `no-restricted-imports` (`clsx`) + `no-restricted-syntax`             |
| [Return types](#return-types)                                               | **Warned**                             | `explicit-module-boundary-types`                                      |
| [Route primitive shape](#route-and-component-shape)                         | **Warned**                             | `openthrottle/route-primitive-shape`, `openthrottle/pre-hooks-unpack` |
| [Hook primitive shape](#hook-shape)                                         | **Enforced**                           | `openthrottle/hook-primitive-shape` + `audit:hook-shape`              |
| [Import order](#import-order)                                               | **Warned**                             | `simple-import-sort/imports`, `simple-import-sort/exports`            |
| [Anti-flake test rules](#anti-flake-test-rules)                             | **Enforced**                           | `openthrottle/no-test-sleep` and four siblings; Vitest `retry: 0`     |
| [Agent-safety rules](#agent-safety-rules)                                   | **Enforced**                           | `openthrottle/mcp-tool-registration` and two siblings                 |
| [Discriminated unions](#discriminated-unions)                               | Honor system                           | —                                                                     |
| [`interface extends` over `&`](#interface-extends-over-)                    | Honor system                           | —                                                                     |
| [`readonly` by default](#readonly-properties)                               | Honor system                           | —                                                                     |
| [Optional properties sparingly](#optional-properties)                       | Honor system                           | —                                                                     |
| [Prefer results over throwing](#prefer-results-over-throwing)               | Honor system                           | —                                                                     |
| [JSDoc](#jsdoc-comments)                                                    | Honor system                           | —                                                                     |
| [Installing libraries](#installing-libraries)                               | Honor system                           | —                                                                     |
| [Frontend design](#frontend-design)                                         | Honor system                           | —                                                                     |
| [Data files hold data](#data-files-hold-data)                               | **Enforced** (React Router projects)   | `openthrottle/data-file-shape`                                        |
| [Named functions use block bodies](#named-functions-use-block-bodies)       | **Enforced** (autofix)                 | `openthrottle/named-function-block-body`                              |
| [A ternary takes at most three lines](#a-ternary-takes-at-most-three-lines) | **Enforced**                           | `openthrottle/three-line-ternary`                                     |
| [Long strings are template literals](#long-strings-are-template-literals)   | **Enforced** (autofix)                 | `openthrottle/long-string-template-literal`                           |
| [JSX consts live under `// Markup`](#jsx-consts-live-under-markup)          | **Enforced** (components)              | `openthrottle/component-primitive-shape`                              |
| [`sideEffects` is declared and true](#sideeffects-is-declared-and-true)     | **Enforced**                           | `monorepo:check-side-effects` (CI + `check:local`)                    |

## Corrections made in the move

Three statements in the old rules tree were wrong about the repo they described. They
are written correctly below; this section exists so nobody re-derives the old version
from an older doc.

1. **`any` inside generic function bodies is no longer permitted.**
   The old `any-inside-generic-functions` rule taught that you may reach for `any` inside
   a generic body when TypeScript cannot connect runtime logic to a conditional return
   type, and its worked example used `return 'hello' as any`. That advice is contradicted
   twice over by the current config: `no-explicit-any` is `error` everywhere, and
   `consistent-type-assertions` is `assertionStyle: 'never'`, so both halves of
   `as any` are independently banned. The rule was **retired, not relocated** — see
   [No `any`](#no-any) for what to do instead.

2. **`noUncheckedIndexedAccess` is on.**
   The old `no-unchecked-indexed-access` rule was written conditionally — "_if_ the user has
   this rule enabled" — and the plan that retired the rules tree recorded it as unset. It
   was enabled workspace-wide in [#503](https://github.com/OpenThrottle/monorepo/pull/503)
   and `tsconfig.base.json` now sets `noUncheckedIndexedAccess: true`. It is a compiler
   error, not a suggestion.

3. **"Explicit return types" is narrower than it sounded, and it only warns.**
   `CLAUDE.md` asserted explicit return types flatly. The machine form is
   `explicit-module-boundary-types` at `warn` — module boundaries only.
   `explicit-function-return-type`, which would cover every function anywhere, is
   deliberately `off`: measured over the same tree the two differ by 1,341 sites versus
   14,973. See [Return types](#return-types).

## General

**Honor system**, except where noted.

- Prefer `const` over `let`; never `var`.
- `async`/`await` over `.then()` chains.
- `import * as React from 'react';` when importing React — this is what the component
  generator template emits, so hand-written files should match.
- Avoid `as` casts and `any` — **enforced**, see below.
- Alphabetize arrays and object keys when order does not matter — **enforced**, see below.

### Alphabetize arrays and object keys

**Enforced** by `sort-keys`, `perfectionist/sort-interfaces` and
`perfectionist/sort-enums`, all at `error`. The perfectionist rules are auto-fixable;
core `sort-keys` is not.

Perfectionist replaced `eslint-plugin-sort-keys-fix` and
`eslint-plugin-typescript-sort-keys` in the ESLint 10 upgrade — both were abandoned and
both crashed under ESLint 10. It is configured with `type: 'custom'` and an explicit
printable-ASCII alphabet rather than its default `'alphabetical'`, because that default
collates by locale (`editors` before `editorWorkingDirectory`) while core `sort-keys`
compares by code point (the capital first). Matching them keeps one collation in the repo.

Object literals are covered by core `sort-keys` alone; `perfectionist/sort-objects` is
deliberately not enabled, because it also reorders destructuring patterns.

This extends to **GraphQL selection sets and fragment fields** in `*.graphql` documents,
enforced by `@graphql-eslint/alphabetize` and fixable with
`pnpm exec eslint --fix <file>.graphql` (or the project's `nx run <project>:lint`).
Exemplar:
[`applications/openthrottle-developer/app/routes/skills.$slug.tsx.graphql`](../../applications/openthrottle-developer/app/routes/skills.$slug.tsx.graphql).

It does **not** apply to the generated `schema.gql`, nor to NestJS
`@ObjectType`/`@InputType` decorator order.

Arrays whose order does not carry meaning get alphabetized too — that one is honor
system, since no rule can tell a meaningful order from an arbitrary one.

### No `as` casts

**Enforced** by `@typescript-eslint/consistent-type-assertions` with
`assertionStyle: 'never'`. Every form of assertion is an error: `x as T`, `<T>x`, and
`x as unknown as T`.

A cast is a claim the compiler cannot check. The alternatives, in order of preference:

- Type the value correctly at its source (a typed parameter, a typed return, a generic).
- Narrow with a runtime check — `typeof`, `in`, `Array.isArray`, a discriminant.
- Write a type predicate (`const isFoo = (value: unknown): value is Foo => …`) so the
  narrowing is a function with a body that can be reviewed and tested, instead of an
  assertion that cannot.
- Parse at the boundary with zod (or the schema already defined for that boundary) so the
  type comes from a check rather than a promise.

**Do not reach for an inline disable.** The root config previously carried a note claiming
`--fix` strips existing disable comments for this rule; that behavior is why disables here
are fragile. If you genuinely cannot avoid an assertion, that is a design problem in the
surrounding types — raise it rather than paper over it.

### No `any`

**Enforced** by `@typescript-eslint/no-explicit-any` at `error`, everywhere, with no
carve-out for generic function bodies (see [Corrections](#corrections-made-in-the-move)).

Use `unknown` for a value whose type you do not know yet, and narrow it. Use a generic
parameter for a value whose type the caller knows. When a conditional return type genuinely
cannot be satisfied from inside the function body, prefer an **overload signature** over an
assertion — the public contract stays precise and the implementation signature stays honest:

```ts
// GOOD — the caller sees the precise mapping; the body needs no assertion.
function youSayGoodbyeISayHello(input: 'hello'): 'goodbye';
function youSayGoodbyeISayHello(input: 'goodbye'): 'hello';
function youSayGoodbyeISayHello(
  input: 'hello' | 'goodbye',
): 'hello' | 'goodbye' {
  return input === 'goodbye' ? 'hello' : 'goodbye';
}
```

### No `await` in loops

**Enforced** by `no-await-in-loop` at `error`.

Sequential awaits in a loop are usually an accident — they serialize work that could run
concurrently and make the total latency the sum rather than the max. Collect the promises
and `await Promise.all(...)` instead:

```ts
// BAD
for (const id of ids) {
  results.push(await fetchOne(id));
}

// GOOD
const results = await Promise.all(ids.map((id) => fetchOne(id)));
```

When the sequencing is deliberate — rate limiting, ordered writes, a dependency between
iterations — that is the case for an inline disable **with a reason**, since the rule
cannot tell deliberate sequencing from an accident.

## Types

### No new enums

**Enforced** by `no-restricted-syntax` → `TSEnumDeclaration` at `error`. Existing enums
are grandfathered; do not add more.

Use an `as const` object when you need enum-like behavior:

```ts
const backendToFrontendEnum = {
  md: 'MEDIUM',
  sm: 'SMALL',
  xs: 'EXTRA_SMALL',
} as const;

type LowerCaseEnum = keyof typeof backendToFrontendEnum; // "md" | "sm" | "xs"

type UpperCaseEnum = (typeof backendToFrontendEnum)[LowerCaseEnum]; // "MEDIUM" | "SMALL" | "EXTRA_SMALL"
```

The specific trap that motivates the ban: **numeric enums produce a reverse mapping**, so
they have twice the keys you wrote.

```ts
enum Direction {
  Up,
  Down,
  Left,
  Right,
}

const direction = Direction.Up; // 0
const directionName = Direction[0]; // "Up"

Object.keys(Direction).length; // 8, not 4
```

### Indexed access returns `undefined`

**Enforced** by the `noUncheckedIndexedAccess` compiler flag, set in `tsconfig.base.json`.

Indexing into a `Record` or an array yields `T | undefined`, because the index signature
promises nothing about which keys exist:

```ts
const obj: Record<string, string> = {};
const value = obj.key; // string | undefined

const arr: string[] = [];
const first = arr[0]; // string | undefined
```

Handle the `undefined` — a guard, a default, or `.at()` with an explicit check. Do not
reach for `!` (non-null assertion) or a cast to make it go away; both are banned by
[No `as` casts](#no-as-casts) in spirit and the second one in fact.

### `import type`

**Enforced** by `@typescript-eslint/consistent-type-imports` at `error`, and
auto-fixable. Prefer a top-level `import type` over an inline `import { type … }`.

```ts
// BAD
import { type User } from './user';

// GOOD
import type { User } from './user';
```

The reason is transpilation: in some environments the first form's import is not erased,
leaving a bare side-effecting import behind.

```ts
// Before transpilation
import { type User } from './user';

// After transpilation
import './user';
```

**What the rule covers.** It is scoped to `**/*.ts` and `**/*.tsx` and cannot live in the
shared base block: it needs parser services, and the `@graphql-eslint/parser` virtual
documents (`*.tsx.graphql`) do not provide them, so a full-repo run would abort with
"You have used a rule which requires type information".

`disallowTypeAnnotations` is **off**. Inline `import('…')` _type annotations_ are a
different thing from import statements and stay allowed —
`vi.importActual<typeof import('../module')>()` is Vitest's own idiom for mock factories
(a top-level import of the module under mock is precisely what those files avoid), and
`typeof import('monaco-editor')` is what keeps the editor bundle lazily loaded.

**Decorator metadata — do not "simplify" this.** The rule's `parserOptions` declare
`emitDecoratorMetadata: true` even though `tsconfig.base.json` sets it to `false`. That
tsconfig value is not true of the decorated surface:
`applications/openthrottle-server/.swcrc` compiles with `decoratorMetadata: true`, so
NestJS constructor injection depends on `design:paramtypes` existing at runtime.

Without that parser option the rule rewrites injected class imports to `import type`, SWC
then emits no runtime binding, and DI fails at boot — while lint, typecheck, build and the
unit tests all stay green. Declaring it made the rule skip 420 of 884 candidate fixes (291
NestJS files down to 93). Aligning the parser options to `tsconfig.base.json` reintroduces
a boot-time failure no gate catches.

### Import order

**Warned** by `simple-import-sort/imports` and `simple-import-sort/exports`, autofixable
with `eslint --fix`.

Imports are sorted by the module path, in the plugin's default groups: side-effect imports,
then packages, then relative — each group separated by a blank line, each group sorted
alphabetically.

```ts
import './load-env';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { buildAppModule } from './app.module';
```

The default groups are used as-is because there was no prior convention to encode — files
predating this rule each ordered imports differently, and one sorted by _local binding
name_, which the plugin cannot express at all since it sorts on the `from` string.

`warn` rather than `error` because 3,743 violations across 3,714 of 5,343 source files were
outstanding when the rule landed, and they were deliberately left unfixed: the rule is fully
autofixable, so the cleanup is a mechanical change of its own rather than a rider on the
change that enabled it. Projects ratchet to `error` individually once sorted, the same way
the component and route primitive shapes graduate.

One behaviour to know before running `--fix`: side-effect imports (`import './x'`) are
always hoisted to the top of their chunk. Their order _relative to each other_ is preserved,
so dependency-ordered registration blocks — the code-first GraphQL `*.enum` → `*.object` →
`*.input` modules, and `main.ts`'s `./load-env` — survive intact. Imports that previously sat
above a side-effect import will end up below it.

### `interface extends` over `&`

**Honor system.** Always prefer interfaces when modelling inheritance. The `&` operator
has bad performance characteristics in the TypeScript checker; use it only where
`interface extends` is not possible.

```ts
// BAD
type A = { a: string };
type B = { b: string };
type C = A & B;

// GOOD
interface A {
  a: string;
}

interface B {
  b: string;
}

interface C extends A, B {
  // Additional properties can be added here
}
```

### `readonly` properties

**Honor system.** Use `readonly` on object type properties by default; it prevents
accidental mutation at runtime. Omit it only when the property is genuinely mutable.

```ts
// BAD
type User = {
  id: string;
};

const user: User = { id: '1' };
user.id = '2'; // allowed

// GOOD
type User = {
  readonly id: string;
};

const user: User = { id: '1' };
user.id = '2'; // Error
```

### Optional properties

**Honor system.** Use optional properties extremely sparingly. Only when the property is
truly optional — and consider whether forgetting to pass it would cause a bug.

`userId` below is always meant to be passed. Making it optional means a call site that
forgets it type-checks, and the request silently runs unauthenticated. `string | undefined`
keeps the value nullable while forcing every caller to say so explicitly.

```ts
// BAD
type AuthOptions = {
  userId?: string;
};

// GOOD
type AuthOptions = {
  userId: string | undefined;
};
```

### Discriminated unions

**Honor system.** Proactively model data that can be in one of several shapes as a
discriminated union.

```ts
type UserCreatedEvent = {
  data: { email: string; id: string };
  type: 'user.created';
};

type UserDeletedEvent = {
  data: { id: string };
  type: 'user.deleted';
};

type Event = UserCreatedEvent | UserDeletedEvent;
```

Handle them with `switch` on the discriminant:

```ts
const handleEvent = (event: Event): void => {
  switch (event.type) {
    case 'user.created':
      console.log(event.data.email);
      break;
    case 'user.deleted':
      console.log(event.data.id);
      break;
  }
};
```

The payoff is **preventing the 'bag of optionals' problem** — states that the type permits
but the system can never actually be in. Here the example _is_ the rule:

```ts
// BAD — allows impossible states: loading with an error, success with no data
type FetchingState<TData> = {
  data?: TData;
  error?: Error;
  status: 'idle' | 'loading' | 'success' | 'error';
};

// GOOD — every representable state is a real state
type FetchingState<TData> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { data: TData; status: 'success' }
  | { error: Error; status: 'error' };
```

## Functions and modules

### Return types

**Warned** by `@typescript-eslint/explicit-module-boundary-types`
(`allowHigherOrderFunctions`, `allowTypedFunctionExpressions`).

Declare return types on functions at the top level of a module. It documents intent, and it
makes a future reader — human or agent — able to understand the contract without reading
the body.

```ts
const myFunc = (): string => {
  return 'hello';
};
```

**Why this rule and not the broader one.** "Top level of a module" _is_ the module
boundary. `explicit-module-boundary-types` says exactly that;
`explicit-function-return-type` says something much broader. Measured over the same tree
the difference is **1,341** sites versus **14,973** — one is a backlog, the other is noise.
Under `pnpm nx run-many --target=lint --all`, which ignores the generated and build output
an ad-hoc sweep picks up, it is **362** warnings. `explicit-function-return-type` stays
`off`.

**Why `warn` and not `error`.** 362 sites cannot be cleared in one change, and the lint
target passes no `--max-warnings`, so this never blocks CI. Its consumer is the weekly
[`Job_RulesConformance`](../../.agents/prompts/Job_RulesConformance.md) sweep, which triages
them into mechanical cleanup tasks. If that sweep stops consuming them, this rule should be
turned **off** rather than left as decoration.

Components returning JSX are the conceptual exception — the return type is always JSX — but
that exception is not machine-expressible, so components are warned about too. Typing them
`React.ReactElement`, as the generators already scaffold, satisfies both.

### No default exports

**Enforced** by `import-x/no-default-export` at `error`.

```ts
// BAD
export default function myFunction() {}

// GOOD
export function myFunction() {}
```

The cost lands on the importer, which is free to invent any name it likes:

```ts
// BAD
import myFunction from './myFunction';

// GOOD
import { myFunction } from './myFunction';
```

A named export gives every call site the same greppable name.

**Framework carve-outs are in the config, not left to judgement.** The exempt set is exactly
the files whose _consumer_ reads the default:

- tooling configs — `*.config.{cjs,cts,js,mjs,mts,ts}`
- graphql-codegen — `codegen.ts`
- React Router — `app/routes.ts`, `app/root.tsx`, `app/entry.*.tsx`, `app/routes/**`
- Storybook — `.storybook/**` and `*.stories.{ts,tsx}` (the CSF `meta` default)
- Nx generators — `src/generators/*/generator.ts`, resolved via `generators.json` `factory`

```tsx
// Fine — React Router requires the default for a route module
export default function Component(props: Route.ComponentProps) {
  return <div>Hello</div>;
}
```

If you hit the rule in a new framework file, **add the glob to the carve-out block with a
note naming the consumer that requires the default** — do not disable the rule inline.

### Prefer results over throwing

**Honor system.** Think before writing code that throws.

If a thrown error produces a desirable outcome in the system, throw — a custom error inside
a backend framework's request handler is exactly right. But for code where the caller would
need a manual `try`/`catch`, return a result type instead:

```ts
type Result<T, E extends Error> =
  { ok: true; value: T } | { error: E; ok: false };
```

```ts
const parseJson = (input: string): Result<unknown, Error> => {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
      ok: false,
    };
  }
};
```

The caller handles both branches, and the type system makes it impossible to forget one:

```ts
const result = parseJson('{"name": "John"}');

if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

Note the `catch` block: the old version of this rule wrote `error as Error`, which
[No `as` casts](#no-as-casts) forbids. `error instanceof Error ? … : …` is the checked form.

### JSDoc comments

**Honor system.** Annotate functions and types with JSDoc — but be concise, and **only when
the behavior is not self-evident**. Put the prose behind an inline `@description` tag, and
use `@link` to reference other functions and types in the same file.

```ts
/**
 * @description Subtracts two numbers
 */
const subtract = (a: number, b: number): number => {
  return a - b;
};

/**
 * @description Does the opposite to {@link subtract}
 */
const add = (a: number, b: number): number => {
  return a + b;
};
```

Separately: exports that are a package's public API need a JSDoc `@public` tag so Knip does
not report them as dead. See [Knip.md](./Knip.md).

## Naming

### Naming conventions

**Enforced** by `@typescript-eslint/naming-convention` at `error` — except the file-name
clause, which no linter can see.

- **A file named for its single export takes that export's casing**: **PascalCase** for a React
  component (`Button.tsx`), **camelCase** for a function (`getFormFieldKind.ts`) — the rule hooks
  already follow (`useFoo.ts`). **kebab-case** for everything else: a module with several exports
  (`schema-refs.ts`), scripts, config. NestJS `<folder>.<kind>.ts` and `data.<name>.ts` keep their
  own forms. The boundary, as
  [`scripts/codemod-file-name-casing.ts`](../../scripts/codemod-file-name-casing.ts) applies it:
  - **Single export means one _value_ export.** Type-only exports beside it don't count, so a
    function plus its `GetFooOptions` / `GetFooResult` types is single-export, exactly like a
    component plus its props or a hook plus `UseFooOptions`.
  - **The file mirrors the identifier exactly**, acronyms included: `getURLParts.ts` for
    `getURLParts`, `getUrlParts.ts` for `getUrlParts`. A kebab stem that named something else
    (`form-field-kind.ts` exporting `getFormFieldKind`) takes the export's name, not a recased
    stem.
  - **`.server` / `.client` suffixes stay** after the name: `getUser.server.ts`.
  - **Companions follow the stem**: `getFoo.test.ts`, `getFoo.stories.tsx`,
    `getFoo.tsx.graphql`.
  - **Still kebab-case:** an ALL_CAPS constant export (`cms-status.ts` exporting `CMS_STATUS` —
    data, not a function or a component), React Router route modules under `app/routes/` (their
    names are URLs), entry scripts directly in a `scripts/` folder, and any module with
    `export *` or a default export.
- **camelCase** variables and functions (`myVariable`, `myFunction()`).
- **PascalCase** classes, types, and interfaces (`MyClass`, `MyInterface`).
- **ALL_CAPS** constants and enum values (`MAX_COUNT`, `Color.RED`).
- Type parameters are **`T`-prefixed** (`TKey`, `TValue`).

```ts
type RecordOfArrays<TItem> = Record<string, TItem[]>;
```

One selector per clause:

| Clause                                                            | Selector                         |
| ----------------------------------------------------------------- | -------------------------------- |
| PascalCase classes / types / interfaces                           | `typeLike`                       |
| `T`-prefixed type parameters                                      | `typeParameter`, `prefix: ['T']` |
| ALL_CAPS enum values                                              | `enumMember`                     |
| camelCase functions (PascalCase for components)                   | `function`                       |
| camelCase variables (PascalCase components, UPPER_CASE constants) | `variable`                       |

**The file-name clause is enforced by an audit, not ESLint** — `naming-convention` operates on
identifiers and cannot see file names. `pnpm run audit:file-name-casing:strict` (run in CI via
`audit:strict`) fails on a file in any application, package or tool that is named for one of its
exports but not in that export's casing: a single-export file, or a multi-export file whose
kebab stem names one of its non-constant exports (`resolve-skill-availability.ts` exporting
`resolveSkillAvailability` and its `SKILL_AVAILABILITY_ENVIRONMENTS` → `resolveSkillAvailability.ts`).
A multi-export file whose name is none of its exports is a bucket and stays kebab-case. Out of scope: the NestJS tier (`openthrottle-server`, `nestjs-*`), whose
`<folder>.<kind>.ts` form is enforced separately, and `tools/nx-plugins`, whose files all export
Nx's mandated `createNodesV2`. It reuses the codemod's definition, so
the fix is always `tsx ./scripts/codemod-file-name-casing.ts --project=<dir> --write`. There is
no allowlist.

**Why a single-export file is named after its export.** The `react` generator's `util` uses one
`name` for the identifier and the file, so it emits `getFormFieldKind.ts` exporting
`getFormFieldKind`. A kebab-case rule forced a hand rename to `form-field-kind.ts` after every
run — drift between the generator and the rule — and broke the one-glance mapping from a file to
the symbol it exports. Matching the export's casing, as components and hooks already did, removes
both. Existing kebab-case single-export files are renamed by OT plans `bc5f6aa0` and `3aca79fe` (a codemod plus a gate),
not opportunistically.

**Prefer a bucket over a file per function.** _(Honor system.)_ The casing rule says how to name
a file that holds one thing; it does not ask for one file per function. When sibling functions
share a subject, put them in one module named for that subject, kebab-case because it has
several exports: `formatDate`, `formatDuration` and `formatBytes` belong in `format.ts`, and
`appendCommitFooters`, `buildFallbackCommitMessage` and `createCommitlintLinter` belong in
`commit.ts`. Bucket by subject first; a shared verb (`format*`, `parse*`) is a fine bucket when
the functions also share a subject. Stay inside one directory, keep at least two members, never
name a bucket `utils`/`helpers`/`common`/`misc`/`shared`, and split a bucket that grows past a
few hundred lines into two subjects. A function with no natural sibling, or a large
self-contained one (an orchestrator), keeps its own camelCase file. Never bucket classes,
components, hooks, ESLint rule modules, NestJS `<folder>.<kind>.ts` files, `data/` files, or
entry points that are loaded by path. The `react` generator's `util` sub-generator still emits
one file per function; merge its output into the subject's bucket when one exists. OT plan
`3aca79fe` applied this to the Node packages and `tools/`.

`leadingUnderscore: 'allowSingleOrDouble'` on the function and variable selectors. Without
it the rule rejects `__dirname`/`__filename` — the standard Node ESM idiom, in every
`codegen.ts` and `apollo.config.mjs` — and the `^_` prefix that `no-unused-vars` is
separately configured to bless.

**Measurement.** The tuned config produced **31 violations** (28 type parameters, 2
variables, 1 function), all fixed in the change that landed the rule — which is why it is
`error` and not `warn`. A once-quoted figure of **30,220** came from the plugin's _default_
options over a tree that still included
`applications/openthrottle-workbench/storybook-static/`; 2,800 of those were single-letter
identifiers inside minified Storybook bundles.

**Three names are deliberately exempt**, each with an inline disable and a reason rather
than a rename:

- `executeGraphql_v2` (`packages/nodejs-graphql`) — `_v2` is public API versioning; renaming
  an exported symbol is a breaking change, not a lint fix.
- `buildWorkflowExecuteGraphql_v2Options` (`packages/openthrottle-agentic-ralph`) — sits next
  to a throw-based sibling named `buildWorkflowExecuteGraphqlV2Options`; the suffix is what
  distinguishes the Result-API variant. Renaming collides the two.
- `type_` (`packages/openthrottle-showroom`) — `type` is a reserved word.

`_v2` in this codebase consistently marks the Result-returning variant of a throw-based
`V2` function. That is a convention, not drift.

### NestJS file names

**Enforced** (`error`) by `openthrottle/nestjs-file-naming` and
`openthrottle/nestjs-file-exports`, wired through `nestjsEslintConfig` from `@tools/dotfiles`
into `openthrottle-server` and every `packages/nestjs-*` project.

NestJS is organised by modules, so a file's name is its folder's name plus a **kind** — the
last dotted segment, which states what the file exports:

```text
queues/usage-limit/
  usage-limit.constants.ts
  usage-limit.service.ts
  usage-limit.types.ts
  usage-limit.utils.ts
```

- **Module-scoped kinds** — `module`, `service`, `processor`, `repository`, `resolver`,
  `controller`, `types`, `constants`, `utils` — are named for their folder: in `queues/plans/` the only
  service name is `plans.service.ts`. A file directly in a project's `src/` takes the
  project's folder name (`packages/nestjs-auth/src/nestjs-auth.module.ts`); an
  application's root `src/app.module.ts` is the one exception.
- **A second module or service in a folder is a second unit, so it gets a sub-folder** —
  `queues/plans/cancel-channel/cancel-channel.service.ts`, never
  `queues/plans/plan-cancel-channel.service.ts` or `plans-cancel-channel.service.ts`. A
  folder makes the second unit visible; a qualifier stacked on the name hides it.
- **Subject-named kinds** — `decorator`, `entity`, `enum`, `error`, `executor`, `factory`,
  `filter`, `guard`, `input`, `interceptor`, `mapper`, `object`, `options`, `policy`,
  `provider`, `strategy`, `token` — describe one thing each and sit many to a folder, so their stem is
  free (`graphql/queues/job.object.ts`). `.error.ts` is a custom `Error` subclass;
  `.interceptor.ts` a Nest `NestInterceptor`; `.filter.ts` a Nest `ExceptionFilter`. A plain class that implements an interface and
  is not itself a Nest provider (a model backend the factory `new`s) is a `.strategy.ts`.
- **A Nest custom provider is a `.provider.ts`**, named for what it provides: the
  `FactoryProvider` that builds a service sits beside it as
  `nest/mcp-toolset-pruner.provider.ts` next to `nest/mcp-toolset-pruner.service.ts`. The kind
  is singular only — `.providers.ts` is reported. (`.factory.ts` is something else: a Fishery
  test-data factory.)
- **Every file has a kind.** `reading-time-minutes.ts` is reported; it is a `.utils.ts`.
  Kinds outside the two lists (`.dates.ts`, `.parser.ts`, `.cron.ts`) are reported too —
  they are `.utils.ts` under another name.
- **Tests mirror their source** (`usage-limit.service.test.ts`). A test of a folder as a
  whole, with no single source, is `<folder>.test.ts` / `<folder>.integration.test.ts`.
- `index.ts` and `main.ts` are exempt. A file that genuinely must keep its name — the
  server's pre-Nest boot files, which deploy commands name by path — is turned off in the
  project's own `eslint.config.ts`, where the exception is reviewed, never with an inline
  disable.

**The kind is a promise about the exports**, checked by `nestjs-file-exports`:

| Kind                                                | Exports                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `.module.ts`                                        | exactly one `@Module()` class, nothing else                                                                  |
| `.service.ts`                                       | exactly one `@Injectable()` class, nothing else                                                              |
| `.processor.ts` / `.resolver.ts` / `.controller.ts` | exactly one `@Processor()` / `@Resolver()` / `@Controller()` class                                           |
| `.utils.ts`                                         | functions only                                                                                               |
| `.types.ts`                                         | types and interfaces only                                                                                    |
| `.constants.ts`                                     | non-function `const` values only                                                                             |
| `.provider.ts`                                      | Nest provider values only: `const` provider objects/arrays or functions returning them; no classes, no types |

So a result type a service returns lives in the folder's `.types.ts`, and a helper it
exports for a test lives in `.utils.ts` — see
`queues/scheduled-agent-jobs/usage-limit-resume/` for both. `.provider.ts` is the one
subject-named kind that is export-checked, so a file of interfaces and an injection token cannot
pass as a provider on its name alone; the other subject-named kinds and tests are not.

## Components and files

### Component and data boundaries

**Enforced** by the ESLint rule `openthrottle/component-primitive-shape` plus
`pnpm run audit:component-shape`.

These boundaries are part of the broader **component primitive shape** — the shape the
`@tools/generators` component template emits, documented in
[component-primitive-shape.md](./component-primitive-shape.md). Conform by default; the
last-resort `/* component-shape: opt-out — <reason> */` pragma is for the
genuinely-impossible case only. Scaffold new components with the generator so they start
conformant.

**Component and data file boundaries:**

- A file in a `components/` folder exports **only** its component and the props generated
  with it (e.g. `Foo` + `FooProps`). Infrequently it may export one extra closely-related
  type or interface — but never constants, hardcoded data, lists, mock data, or copy.
- Hardcoded data, lists, mock data, and user-facing copy belong in the nearest `data/`
  folder, not inlined in components. Use the standardized `data.<name>.ts` naming (`.tsx`
  only when it needs JSX) so one file can export many related values:
  - User-facing copy → `data.copy.ts`
  - Mock fixtures → `mock.<name>.ts`
  - Other static data and lists → `data.<name>.ts`
  - Functions never — they go to the sibling `utils/`. See
    [Data files hold data](#data-files-hold-data).
- The component imports the data via the `~/routing/<area>/data/…` alias and renders it.
  Because the component imports it (a real cross-module use reachable from a route entry),
  Knip treats it as used — no `@public` tag needed on data exports.

**Testing data files:**

- **Pure hardcoded data files do not warrant their own spec.** A test that re-states the
  literals (`expect(COPY.title).toBe('…')`) is a tautology and a change-detector: it breaks
  on every intentional edit and protects nothing. The component or route spec that renders
  the data already covers that it is used.
- **Spec a data file only when it carries logic or an invariant worth guarding** —
  derivation, parsing, filtering, computed or sorted lists, uniqueness, or a shape rule
  ("every entry is a valid URL"). Assert the **rule**, not the specific values.
- When copy is the contract, the consuming component or route spec asserts against the
  imported constant from `data.copy.ts` (single source of truth) rather than a duplicated
  literal — see
  [snapshot-replacement-patterns.md](../testing/snapshot-replacement-patterns.md).

### Route and component shape

**Warned** by `openthrottle/route-primitive-shape` and `openthrottle/pre-hooks-unpack`;
the component rule above is `error`. Full contracts:
[component-primitive-shape.md](./component-primitive-shape.md) and
[route-primitive-shape.md](./route-primitive-shape.md).

The short version:

- Keep the generated six section markers in order, even when a section is empty —
  `// Hooks`, `// Setup`, `// Handlers`, `// Markup`, `// Life Cycle`,
  `// 🔌 Short Circuit`. The order structurally prevents Rules-of-Hooks violations.
- **Unpack `props` in the pre-Hooks block.** The identity `const { … } = props` and any
  nested identity destructures of those bindings (`const { repository } = loaderData`) sit
  **before** `// Hooks`. Derived or narrowed values (`'x' in y`, maps, formatters) go under
  `// Setup`. **Never** unpack after `// Hooks` or after `// 🔌 Short Circuit`. Same rule
  for authored `FooProps` and for route `Route.ComponentProps`.
- One component per file, exporting only the component and its props.
- File-scope helpers, data and config are hoisted to a sibling `utils/`, `data/` or
  `config/` — or into a `use<Name>` hook.

### Hook shape

**Enforced** by the ESLint rule `openthrottle/hook-primitive-shape` plus
`pnpm run audit:hook-shape:strict`. Full contract:
[hook-primitive-shape.md](./hook-primitive-shape.md).

The short version:

- One `use*` hook per file, named after the file (`useFoo` in `useFoo.ts`), in a `hooks/`
  folder. Never kebab-case.
- Export only the hook, its `UseFooOptions` and its `UseFooResult`. Other types go to
  `types.ts`, helpers to `utils/`, data to `data/`, tunables to `config/`.
- No module-scope values. A value only the hook uses lives inside it. When an object or
  array's identity matters (it reaches a dependency array, a memoized child, a context, or
  the hook's return value), derive it with `React.useMemo`, or import a constant from
  `data/` / `config/` when it doesn't depend on inputs.
- The six section markers and an explicit return type, as in a component.

### File length caps

**Enforced** by `max-lines`: 210 lines for authored components and routes. shadcn
primitives under `packages/react-router-shadcn` are exempt (`max-lines: 'off'`) and use the
`primitive` profile of the shape rule instead.

A caveat worth knowing: the repo's formatting hook runs **after** lint, so a file that
measures 210 before Prettier can land at 211 after. Check the cap on the formatted file.

## Readability

All five have a lint rule at `error` (OT plan `a8cb40e5`); "JSX consts live under
`// Markup`" covers components only.

**We write code for humans.** The compiler and the minifier make code concise; the source
does not have to be. These five conventions came out of the PR #622 review, and the
reference fixes are in that PR's review commit: `ScheduleRunStatusCell.tsx`,
`PlanRunStatusCell.tsx`, `routing/schedule/utils/run-usage-limit-rows.ts` and
`global/utils/utils.usage-limit.ts` in `openthrottle-developer`.

### Data files hold data

A `.ts` file directly under a `data/` folder is named `data.<name>.ts` (`.tsx` only when it
needs JSX), and it exports **values, not functions**. User-facing copy goes in
`data.copy.ts` and mock fixtures in `mock.<name>.ts`, as
[Component and data boundaries](#component-and-data-boundaries) already says. A function —
a merge, a filter, a formatter, a row builder — belongs in the sibling `utils/`, even when
it only ever reads that data. Spec files under `__tests__/` are exempt.

**Why.** The prefix makes every data file sort together and say what it is, so
`data/` is greppable by name alone. A function in `data/` is logic hiding where nobody
looks for it, and it is exactly the case [Testing data files](#component-and-data-boundaries)
says _does_ need a spec.

```text
// BAD
routing/settings/data/mcp-connectors.data.ts
routing/settings/data/url-matrix-rows.ts
routing/settings/data/data.agent-clis.ts   ← exports mergeAgentClis()

// GOOD
routing/settings/data/data.mcp-connectors.ts
routing/settings/data/data.url-matrix-rows.ts
routing/settings/data/data.agent-clis.ts   ← values only
routing/settings/utils/merge-agent-clis.ts ← the function
```

A `data/index.ts` barrel keeps its name — it re-exports data files rather than being one —
but it may not export a function either.

**Enforcement.** `openthrottle/data-file-shape` is on at `error` in the React Router apps
(`openthrottle-developer`, `-admin`, `-website`) and every `react-router-*` package. It
landed at `warn` with 180 reports — 95 misnamed files and 85 exported functions (developer
129, admin 8, website 1, packages 42) — and went to `error` once those were migrated. It is opt-in, via `dataFolderEslintConfig` from
`@tools/dotfiles` spread after `eslintConfig`, rather than part of the base config: nx lints
with cwd at the project, so a path glob cannot tell those projects from the Node packages
that also keep a `data/` folder. It reports a function declaration, a `const` bound to an
arrow or function expression, or a local function exported by specifier or `default`; a
re-export (`export … from`) is left to the file it names.

### Named functions use block bodies

A function bound to a name — a `const` declarator or a class property — has a block body
and an explicit `return`. Never a concise `=> expr`.

```ts
// BAD
const formatResetTime = (date: Date): string => date.toLocaleString();
const toRow = (run: Run): Row => ({
  label: run.id,
  mono: true,
  value: run.status,
});

// GOOD
const formatResetTime = (date: Date): string => {
  return date.toLocaleString();
};
const toRow = (run: Run): Row => {
  return { label: run.id, mono: true, value: run.status };
};
```

**Why.** A named function is a unit a reader navigates to; the block body gives it one
shape everywhere, a place to add a line without restructuring, and a `return` to set a
breakpoint on. The parenthesised object-literal body (`=> ({ … })`) is the one people
misread most.

**Scope decision: inline callbacks are exempt.** A function passed straight into a call or a
JSX attribute — `rows.map((row) => row.id)`, `onClick={() => setOpen(true)}`,
`.filter(isActive)` — is an argument, not a named unit, and wrapping it in a block makes
the call site longer without making it clearer. This matches the PR #622 fixes. Object
literal methods (`{ onSelect: () => … }`) count as inline. The rule that enforces this
reports a concise arrow whose parent is a `VariableDeclarator` or a `PropertyDefinition`,
nothing else — which is why it is a custom rule and not core `arrow-body-style`, which
would hit every callback.

**Enforcement.** `openthrottle/named-function-block-body` is on at `error` repo-wide. It
raised 2,227 warnings across the 72 lint targets when it landed; they were migrated with
`eslint --fix`, which rewrites `=> expr` to `=> { return expr; }`, drops the parentheses
around an object-literal body, and skips any site with a comment between the arrow and the
body (fix those by hand). The generator templates are held to it by
`tools/generators/src/generators/__tests__/generated-readability.test.ts`, which lints a freshly
generated component, hook and route with every readability rule.

### A ternary takes at most three lines

A ternary stays on one line, or wraps into exactly three: the condition on the line that
introduces it, then `? …`, then `: …`. Anything longer asks the reader to hold too much.

```ts
// GOOD — one line
const label = hasResetTime ? knownResetLabel : resetUnknown;

// GOOD — three lines, condition on the `=` line
const label = hasResetTime
  ? `${resetsPrefix} ${formatWhen(run.usageLimitResetsAt)}`
  : resetUnknown;

// BAD — four lines: the condition wrapped below the `=`
const label =
  run.usageLimitResetsAt !== null
    ? `${resetsPrefix} ${formatWhen(run.usageLimitResetsAt)}`
    : resetUnknown;

// GOOD — name the condition and the ternary starts on the `=` line
const hasResetTime = run.usageLimitResetsAt !== null;
const label = hasResetTime
  ? `${resetsPrefix} ${formatWhen(run.usageLimitResetsAt)}`
  : resetUnknown;
```

**Prettier decides where the condition goes, not you.** Prettier keeps a bare name, a
member access, a call or a `!x` on the `=` line, but pushes a binary condition
(`a === b`, `a && b`, `a ?? b`) below the `=` whenever the ternary wraps. So
`const x = item === false` followed by `? … : …` on two lines cannot be written: Prettier
turns it into the four-line BAD shape. Name the condition. The same applies after an
object key's `:` and an arrow's `=>`. A `return` keeps even a binary condition on its line,
and a wrapped call argument starts on its own line by argument layout, so neither counts
as wrapped.

Past three lines (a wrapped chain, or a branch that wraps), name the branches, extract a
well-named util, or use `if`/`else`. A **spread-ternary** whose branch wraps becomes a
util that pushes rows. See `runUsageLimitRows` in
`routing/schedule/utils/run-usage-limit-rows.ts`:

```ts
// BAD
const rows = [
  ...baseRows,
  ...(run.status === 'usage_limited'
    ? [{ label: fields.usageLimitResetsAt, mono: false, value: resetsAt }]
    : []),
];

// GOOD
const rows = [...baseRows, ...runUsageLimitRows(run)];
```

**Why.** Condition, yes-branch and no-branch on three lines reads as a sentence. A fourth
line means one of them did not fit, and the reader has to reassemble it. Naming the
unnamed piece puts it back.

**Scope decision: JSX conditionals are in scope.** A `{cond ? (<A …/>) : (<B …/>)}` whose
branches are whole subtrees runs past three lines, and it is the worst offender. Hold each
branch in a `// Markup` const and the ternary fits:

```tsx
// GOOD — ScheduleRunStatusCell.tsx
return (
  <>
    {hasResetTime ? knownResetTime : unknownResetTime}
    {resumeScheduled ? null : notResumedNote}
  </>
);
```

`{cond && <A />}` is not a ternary and is out of scope, and so is a conditional _type_
(`T extends U ? X : Y`).

**Enforcement.** `openthrottle/three-line-ternary` is on at `error` repo-wide. It reports
a `ConditionalExpression` that spans more than three lines (`tooManyLines`), and a wrapped
one whose condition starts on a later line than the `=`, `:` or `=>` that introduces it
(`wrappedCondition`). The introducer is identified by the parent node (a variable, an
assignment, a property, a default value, an arrow body), so `return`, call arguments and
`case` labels are never mistaken for one. A wrapped chain (`a ? b : c ? d : e`) is reported
once, on its outermost link. It has no autofix, because the fix is a human choosing a name.
It is a custom rule rather than core `multiline-ternary`, which fights Prettier's
width-based wrapping.

### Long strings are template literals

A string value long enough that Prettier would move it onto its own line under its key is
written as a template literal, which Prettier leaves on the key's line.

```ts
// BAD — Prettier wraps the quoted string under its key
const COPY = {
  notResumedSuffix:
    'Not resumed automatically — the next scheduled fire picks it up.',
};

// GOOD
const COPY = {
  notResumedSuffix: `Not resumed automatically — the next scheduled fire picks it up.`,
};
```

**Why.** Copy reads as `key: value` on one line, and a diff that edits the string touches one
line, not two. `data.copy.ts` files already use backticks throughout. Short strings keep
single quotes: the convention is about strings that wrap, not about quote style.

**Enforcement.** `openthrottle/long-string-template-literal` is on at `error` repo-wide. It
raised 420 warnings across the 72 lint targets when it landed at `warn`; those sites were
migrated with its autofix and the rule flipped to `error` (task `73b46adb`). It reports a quoted string
that starts on a later line than the `:` or `=` before it, which is exactly what Prettier
prints when it moves a string below its key. It checks three positions: an object property
value, a class property value, and a `const x =` initializer. Call arguments are out of
scope, because Prettier puts every argument on its own line once a call outgrows the print
width; a string alone on its line there is no signal, and backticks would not change the
layout. The autofix rewrites the string as a template literal on the key's line. It drops
the quote escape and escapes `` ` `` and `${`. It skips the fix when a comment sits between
key and value, or when the string has a legacy octal escape; fix those by hand.

Two alternatives were measured and rejected (plan `a8cb40e5`, task `1cc27f78`):

- **`quotes: ['error', 'backtick']` repo-wide** raised **109,423** warnings over the same 72
  targets. That is every short string in the repo, so its churn would bury `git blame`, and
  it enforces a quote style when the convention is about wrapping. Import specifiers,
  directives and JSX attribute values are exempt by design, so the interaction cost is low;
  the churn is what rules it out. Core `quotes` is also deprecated (a formatting rule, frozen
  since ESLint 8.53), and its `@stylistic` replacement is not installed.
- **Honor system only** was the status quo, and the PR #622 review showed it does not hold.

### JSX consts live under `// Markup`

A `const` whose value is JSX is markup, so it is declared under `// Markup`.
`// 🔌 Short Circuit` holds only early `if (…) return …;` statements before the final
`return`.

```tsx
// BAD
// 🔌 Short Circuit
const badge = <Badge>{label}</Badge>;
if (!isUsageLimited) {
  return badge;
}

// GOOD
// Markup
const badge = <Badge>{label}</Badge>;

// Life Cycle

// 🔌 Short Circuit
if (!isUsageLimited) {
  return badge;
}
```

**Why.** The section markers are a map. A reader looking for what a component renders reads
`// Markup`; a reader looking for when it bails out reads `// 🔌 Short Circuit`. Markup
declared below the bail-outs is in neither place anyone looks.

**Enforcement.** `openthrottle/component-primitive-shape` reports a top-level `const` in a
component body that is declared after `// 🔌 Short Circuit` and whose initializer is JSX
(an element, a fragment, or a `?:` / `&&` / `||` / `??` with a JSX operand). Nested
scopes are not inspected, and route modules are not covered yet.

## Where code goes

Placement, naming and folder structure are the [`ot-folders`](../../skills/ot-folders/SKILL.md)
skill's subject, not this document's — including `app/global/` vs `app/routing/<area>/`, the
application-vs-package decision, and the `@nx/enforce-module-boundaries` tag rules.

Two placement rules are load-bearing enough to restate:

- **No deep package imports.** Import from a package's main entry only; re-export from its
  `index.ts`.
- **Generators first.** Before hand-writing a component, route, service or package, check
  `@tools/generators` — see [Generators](#generators).

## Frontend design

**Honor system.** The vendored [`frontend-design`](../../.agents/skills/frontend-design/SKILL.md)
skill supplies the **aesthetic rubric** (distinctive, production-grade, non-"AI-slop" UI).
It is deliberately stack-agnostic; realize it through OpenThrottle's stack rather than
introducing a parallel UI system.

**Stack.**

- Build UI only in the React Router v8 + Vite apps: `openthrottle-developer`,
  `openthrottle-admin`, `openthrottle-website`.
- Compose from `@openthrottle/react-router-shadcn` (source in
  `packages/react-router-shadcn/src/components`). Reach for an existing component before
  hand-rolling one; if a primitive is missing, add it to that package rather than inlining a
  bespoke variant in an app.
- Style with the Tailwind + shadcn tokens already in the design system. Do not hardcode raw
  colors or spacing that bypass the tokens — distinctive ≠ off-system.

**Table row actions.**

- Per-row action columns in `*Table.tsx` / `*-table-columns.tsx` use `GlobalPopover` from
  `@openthrottle/react-router-ui-global` with `GlobalPopoverActionsHeader` (right-aligned
  `Actions`). Do not hand-roll a `DropdownMenu` overflow or invent a new Actions header.
- Collapse inline primary buttons into the menu when the row already links to its detail view
  elsewhere (one trigger at the end of the row).
- A single action with no detail link may stay inline — a one-item menu is worse UX than a
  button.
- Bulk and toolbar action bars are a different surface; do not route them through
  `GlobalPopover`.
- Details and a copy-paste example:
  [`packages/react-router-ui-global/README.md`](../../packages/react-router-ui-global/README.md).

### Composing classes with `cn`

**Enforced.** Compose Tailwind classes with `cn` from `@openthrottle/react-router-shadcn`,
never a template literal or bare `clsx`. It is mandatory whenever a `className` prop is merged
in, and the caller's `className` always goes last.

`no-restricted-imports` rejects a `clsx` import everywhere except `react-router-shadcn`, and
`no-restricted-syntax` rejects a template literal with an expression directly inside a JSX
`className` (both in [`tools/dotfiles/src/index.ts`](../../tools/dotfiles/src/index.ts)).
Putting the caller's `className` last is not something either rule can see, so that part stays
honor system.

`cn` is `twMerge(clsx(inputs))`, so it reads exactly like `clsx` — strings, conditionals,
objects, arrays — and then resolves Tailwind conflicts so the last conflicting class wins.
`clsx` alone does not: `clsx('px-4', className)` with a caller's `px-2` emits both, and which
one renders depends on stylesheet order, not on what the caller asked for. Template literals
do the same with worse readability.

```tsx
// ❌ Both padding classes ship; the caller's px-2 may or may not win
<div className={clsx('rounded-md px-4', isActive && 'bg-muted', className)} />
<div className={`rounded-md px-4 ${isActive ? 'bg-muted' : ''} ${className}`} />

// ✅ Conflicts resolve; the caller's className overrides the base
<div className={cn('rounded-md px-4', isActive && 'bg-muted', className)} />
```

`clsx` stays acceptable in exactly two places: inside `react-router-shadcn` itself (it is what
`cn` is built on), and in a package that does not depend on `react-router-shadcn` (none today).
How components inside that package place `className` relative to `cva` variants is covered by
its own [conventions](../../packages/react-router-shadcn/README.md#conventions).

**Caveats** — check these whenever you swap `clsx` or a template literal for `cn`:

1. **`cn` silently drops conflicting classes.** A component that passed conflicting classes by
   accident renders differently after the swap. Review every call where the base classes and a
   conditional or `className` class set the same property, and confirm the merged result is
   the one the UI wants.
2. **Custom theme scales named like built-ins are misread.** tailwind-merge (Tailwind v4 aware)
   would treat a custom `--text-2xs` font size as a text colour, and drop it next to a
   `text-*` colour. No custom `--text-*` tokens exist today; adding one means moving `cn` to
   `extendTailwindMerge` with that scale registered.
3. **Tests asserting two conflicting classes fail after the swap.** Update the assertion to the
   merged result; do not revert to `clsx` to keep the old assertion green.
4. **Runtime cost is negligible.** tailwind-merge caches parsed class lists in an LRU, and a
   module-scope `cn(...)` constant computes once.

## Testing

**Honor system.**

- Test all new components and functions.
- **A test is named for the file it tests and lives in a sibling `__tests__/` folder**:
  `src/utils/format.ts` → `src/utils/__tests__/format.test.ts`, never `src/utils/format.test.ts`.
  A qualifier goes between the stem and `.test` (`format.integration.test.ts`). A bucket's
  functions share the bucket's test, one `describe` per function. Only a suite that genuinely
  spans several files (a parity, guard, replay or integration suite) takes a descriptive name.
  The NestJS tier (`openthrottle-server`, `nestjs-*`) is the exception: its `<folder>.<kind>.test.ts`
  sits beside the file it covers.
- Use `component`, not `screen`, to get elements.
- Use `userEvent`, not `fireEvent`, to simulate interactions.
- Use `waitFor` for asynchronous DOM updates.
- Generate mock data from GraphQL in the application's `mocks.ts`.
- Each `if` branch in the logic gets its own `describe` block.
- Always include edge cases.
- **Assert behavior and structure** — roles, labels, `href`, test ids — not marketing copy.
  Prefer `getByRole`/`getByLabelText` over `getByText` for sentence-length strings. When the
  exact copy _is_ the contract (error and empty-state messages, branded text), single-source
  it in the area's `data/data.copy.ts` (`.tsx` if it needs JSX): the component renders the
  constant and the spec imports the same constant, so a wording change touches one place and
  no spec breaks. See
  [snapshot-replacement-patterns.md](../testing/snapshot-replacement-patterns.md).

The React Router apps share one Vitest setup: `tests/setup.ts` is a single
`setupReactRouterTest({ env: { APP_NAME: '<app>' } })` call from
`@openthrottle/react-router-testing` (jsdom polyfills, `window.env` fixture, and a baked-in
`afterEach(cleanup)`). Do not re-add those shared shims per app.

### Anti-flake test rules

**Enforced** — ESLint `error` since plan `0b6dfaf8` burned the existing sites down. They apply
to `*.test.ts(x)`, `*.spec.ts(x)` and everything under `__tests__/`. The three clock rules
(`no-test-sleep`, `no-wall-clock-in-tests`, `no-per-test-timeout`) skip `*.integration.test.ts`
suites. Those are env-gated, do real I/O against git, Postgres, BullMQ or child processes, and
wait on real time by design. A test that depends on the real clock or the machine's speed passes locally and
fails on a loaded CI runner, so each rule names the deterministic replacement.

| Rule                                  | Flags                                                                                        | Use instead                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `openthrottle/no-test-sleep`          | `new Promise((r) => setTimeout(r, N))`, `timers/promises`, same-file sleep helpers           | `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()`; `vi.waitFor` / `expect.poll` for real OS events |
| `openthrottle/no-wall-clock-in-tests` | `Date.now()`, no-argument `new Date()` / `Date()`, `performance.now()`                       | A fixed timestamp constant, or `vi.setSystemTime()`                                                     |
| `openthrottle/no-per-test-timeout`    | A timeout argument or `{ timeout }` / `{ retry }` on a test or hook; `vi.setConfig` timeouts | Make the test faster, or move real I/O into a `*.integration.test.ts` suite (exempt)                    |
| `openthrottle/skip-requires-issue`    | `.skip` / `.todo` / `xit` without a `#123`, issue URL or OT id in a comment above            | Cite the tracking issue, or delete the test. `skipIf` / `runIf` are allowed                             |
| `openthrottle/no-fire-event`          | Importing `fireEvent` from `@testing-library/*` (one report per file)                        | `userEvent`; under fake timers, `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`            |

`no-test-sleep` skips files that call `vi.useFakeTimers()`, and `no-wall-clock-in-tests` also
skips files that call `vi.setSystemTime()`, because under a fake clock those calls are
deterministic. A delay of `0` is a tick flush, not a sleep. Drag-and-drop with a `dataTransfer`
and `<input type="color">` changes are the cases `userEvent` cannot drive. They keep
`fireEvent` behind an inline disable that states the reason.

Retries are pinned to `0` (`VITEST_RETRY` in `@tools/dotfiles`, mirrored in the configs that
bypass the factory). A retry turns a flaky test green without fixing it.

### Agent-safety rules

**Enforced** — ESLint `error` since plan `0b6dfaf8` burned the existing sites down. Each one routes a sensitive operation
through the code that already hardens it.

| Rule                                      | Flags                                                                                                                                         | Use instead                                                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `openthrottle/mcp-tool-registration`      | `server.registerTool(…)`, `server.tool('name', …)` and `@Tool` from `@rekog/mcp-nest`, outside openthrottle-mcp's registry                    | `defineTool` in `packages/openthrottle-mcp/src/tool-registry.ts`, mirrored on the Nest surface                         |
| `openthrottle/agent-cli-spawn-chokepoint` | A `child_process` / `execa` / `cross-spawn` call naming an agent CLI (`claude`, `codex`, `cursor-agent`, `gemini`, `grok`, `opencode`, `agy`) | `runDriverSync` / `runDriverAsync` from `@openthrottle/openthrottle-drivers`, or an agentic-utils conversation backend |
| `openthrottle/disable-requires-reason`    | An `eslint-disable`, `-line` or `-next-line` directive with no `-- reason`                                                                    | `// eslint-disable-next-line <rule> -- <why the rule is wrong here>`                                                   |

Every MCP handler in the registry calls the OpenThrottle GraphQL API with the caller's token, so
the server's auth guards decide what a tool can touch, and a parity test keeps the stdio and Nest
surfaces identical. A tool registered anywhere else gets neither. The driver engine and the
conversation backends pin the binary, scrub the environment, pass an argv array with no shell,
and enforce idle and wall-clock timeouts with SIGTERM→SIGKILL teardown. A third spawn site gets
none of that.

Both chokepoint rules skip test files, which stub `registerTool` and spawn fake binaries on
purpose. Their allowed files are rule options matched against the absolute path, because
`nx lint` runs with cwd at the project. The spawn rule is syntactic, so it only sees a binary
named in the file: a literal, a same-file `const`, or the first word of a shell string. A blanket
`/* eslint-disable */` with no rule list hides every report after it, including the one
`disable-requires-reason` would make, so that form cannot be caught. Only generated files use
it, and the shared config ignores those.

Server-side testing conventions — mocking NestJS providers in `beforeEach`, model factories
from the repository and entity factories from the service — live in the
[`ot-stack`](../../skills/ot-stack/SKILL.md) skill alongside the rest of the platform
conventions.

## Generators

**Honor system**, and the one most worth internalizing: **check for a generator before
writing any new component, route, service or package by hand.** If no generator fits, say so
explicitly before writing custom code.

The discovery workflow, the full selection matrix, and the flags per sub-generator belong to
the [`ot-generators`](../../skills/ot-generators/SKILL.md) skill and
[AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md). Two facts that are needed at the point
of use:

- Every invocation needs the `NX_ISOLATE_PLUGINS=false` prefix.
- A component in a **package** is a different generator from a component in an
  **application** — `react --subGenerator=component --destination=<project>` versus
  `react-router --subGenerator=component --application=<app> --folder=<path>`. Both scaffold
  components; neither is "the component generator". This is the distinction that actually
  gets missed.

## Package metadata

### `sideEffects` is declared and true

**Enforced.** Every `applications/*`, `packages/*` and `tools/*` `package.json` declares
`sideEffects`, and the value is true of the code: `false` when no module does anything on
evaluation, otherwise an array naming exactly the files that do. Never `true`.

**Why declare it.** It is bundler metadata (Vite/Rolldown, esbuild, webpack). Without it a
bundler must assume every module reachable through a barrel `export *` is needed and keep it —
adding it to the `react-router-*` packages cut the developer app's client JS by 70% (#422).

**Why it must be true.** `false` lets a bundler drop a module whose exports nothing uses,
**top-level code included**. On a module that registers something, installs a polyfill or
boots a process, an untrue `false` silently deletes that behavior. `true` is not the safe
alternative: it switches the optimization off for the whole package.

**What counts as a side effect** — the rules
[`scripts/check-side-effects.ts`](../../scripts/check-side-effects.ts) applies:

- A discarded expression at module scope (`registerEnumType(...)`, `polyfill()`,
  `globalThis.X = …`), top-level control flow, top-level `await`, and a bare import of a
  package (`import 'reflect-metadata'`) make **that module** a side effect.
- A bare import of a relative module (`import './bootstrap'`) makes the **target** a side
  effect — it is imported for its effect.
- Any tracked stylesheet adds `**/*.css` (or its extension). The importing component is never
  listed — that would pin the component into every bundle that touches its barrel.
- A bound call (`export const store = createStore()`), a directive, a `/* @__PURE__ */` call
  and an assignment to a property of a local binding (`Button.displayName = …`) are clean.
  Decorators are counted, not flagged.
- A built package (`main` in `./dist/src/…`) lists each flagged module at its source path
  **and** its emitted `./dist/src/….js` path, because the bundler sees the emitted one.

**How.** Run `pnpm exec tsx scripts/check-side-effects.ts` for the per-project report and
recommendation (`--project <dir>` narrows it, `--json` for tooling). The gate,
`pnpm nx run monorepo:check-side-effects`, is the same script with `--strict` and prints the
value to set. To make a module clean rather than list it, move its top-level effect into a
function its caller invokes.

## Installing libraries

**Honor system.** When installing a library, **do not pick a version from memory** — your
training data has a cutoff and the JavaScript ecosystem moves faster than it. Let the package
manager resolve the latest version.

This repo is pnpm + Nx, and new packages go in the workspace root:

```bash
pnpm add -D @typescript-eslint/eslint-plugin -w
```

## What is not here

- **Server, GraphQL and NestJS conventions** — resolver return types (hand-written
  `@ObjectType()` classes and `*ListResult` envelopes), backwards-compatible schema changes
  (deprecate, never remove), entity and service testing:
  [`ot-stack`](../../skills/ot-stack/SKILL.md).
- **Where files go and what they are named** — folder layout, the
  application-vs-package decision, module boundary tags:
  [`ot-folders`](../../skills/ot-folders/SKILL.md).
- **Scaffolding** — [`ot-generators`](../../skills/ot-generators/SKILL.md).
- **Plans and tasks** — plans live in OpenThrottle only, never in Markdown:
  [`ot-plans`](../../skills/ot-plans/SKILL.md).
- **Git, commits and PRs** — [`github-commit`](../../skills/github-commit/SKILL.md),
  [`github-pull-request`](../../skills/github-pull-request/SKILL.md),
  [`github-squash`](../../skills/github-squash/SKILL.md).
- **The CI gates themselves** — [CI-quality-gates.md](./CI-quality-gates.md).
