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

| Convention                                                            | Enforcement                            | Mechanism                                                                           |
| --------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| [No new enums](#no-new-enums)                                         | **Enforced**                           | `no-restricted-syntax` → `TSEnumDeclaration`                                        |
| [Component and data boundaries](#component-and-data-boundaries)       | **Enforced**                           | `openthrottle/component-primitive-shape` + `audit:component-shape`                  |
| [No default exports](#no-default-exports)                             | **Enforced**                           | `import/no-default-export`                                                          |
| [`import type`](#import-type)                                         | **Enforced**                           | `@typescript-eslint/consistent-type-imports`                                        |
| [Naming conventions](#naming-conventions)                             | **Enforced** (file names honor system) | `@typescript-eslint/naming-convention`                                              |
| [Indexed access is `\| undefined`](#indexed-access-returns-undefined) | **Enforced**                           | `noUncheckedIndexedAccess` compiler flag                                            |
| [No `as` casts](#no-as-casts)                                         | **Enforced**                           | `consistent-type-assertions`, `assertionStyle: 'never'`                             |
| [No `any`](#no-any)                                                   | **Enforced**                           | `@typescript-eslint/no-explicit-any`                                                |
| [Alphabetize keys](#alphabetize-arrays-and-object-keys)               | **Enforced**                           | `sort-keys`, `sort-keys-fix`, `typescript-sort-keys`, `@graphql-eslint/alphabetize` |
| [File length caps](#file-length-caps)                                 | **Enforced**                           | `max-lines` (210 components / 210 routes)                                           |
| [No `await` in loops](#no-await-in-loops)                             | **Enforced**                           | `no-await-in-loop`                                                                  |
| [Return types](#return-types)                                         | **Warned**                             | `explicit-module-boundary-types`                                                    |
| [Route primitive shape](#route-and-component-shape)                   | **Warned**                             | `openthrottle/route-primitive-shape`, `openthrottle/pre-hooks-unpack`               |
| [Discriminated unions](#discriminated-unions)                         | Honor system                           | —                                                                                   |
| [`interface extends` over `&`](#interface-extends-over-)              | Honor system                           | —                                                                                   |
| [`readonly` by default](#readonly-properties)                         | Honor system                           | —                                                                                   |
| [Optional properties sparingly](#optional-properties)                 | Honor system                           | —                                                                                   |
| [Prefer results over throwing](#prefer-results-over-throwing)         | Honor system                           | —                                                                                   |
| [JSDoc](#jsdoc-comments)                                              | Honor system                           | —                                                                                   |
| [Installing libraries](#installing-libraries)                         | Honor system                           | —                                                                                   |
| [Frontend design](#frontend-design)                                   | Honor system                           | —                                                                                   |

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

**Enforced** by `sort-keys`, `sort-keys-fix/sort-keys-fix`, `typescript-sort-keys/interface`
and `typescript-sort-keys/string-enum`, all at `error`. `sort-keys-fix` is auto-fixable.

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

**Enforced** by `import/no-default-export` at `error`.

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
const subtract = (a: number, b: number): number => a - b;

/**
 * @description Does the opposite to {@link subtract}
 */
const add = (a: number, b: number): number => a + b;
```

Separately: exports that are a package's public API need a JSDoc `@public` tag so Knip does
not report them as dead. See [Knip.md](./Knip.md).

## Naming

### Naming conventions

**Enforced** by `@typescript-eslint/naming-convention` at `error` — except the file-name
clause, which no linter can see.

- **kebab-case** file names (`my-component.ts`) — except React components, which are
  **PascalCase**. _Honor system._
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

**The file-name clause is not enforced** — `naming-convention` operates on identifiers and
cannot see file names. kebab-case files with PascalCase components stay honor system;
`@tools/generators` scaffolding them correctly is the practical safeguard.

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

### File length caps

**Enforced** by `max-lines`: 210 lines for authored components and routes. shadcn
primitives under `packages/react-router-shadcn` are exempt (`max-lines: 'off'`) and use the
`primitive` profile of the shape rule instead.

A caveat worth knowing: the repo's formatting hook runs **after** lint, so a file that
measures 210 before Prettier can land at 211 after. Check the cap on the formatted file.

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
  `openthrottle-admin`, `openthrottle-website`, `openthrottle-email`.
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

## Testing

**Honor system.**

- Test all new components and functions.
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

## Installing libraries

**Honor system.** When installing a library, **do not pick a version from memory** — your
training data has a cutoff and the JavaScript ecosystem moves faster than it. Let the package
manager resolve the latest version.

This repo is pnpm + Nx, and new packages go in the workspace root:

```bash
pnpm add -D @typescript-eslint/eslint-plugin -w
```

## What is not here

- **Server, GraphQL and NestJS conventions** — resolver return types (`Result()`,
  `PaginatedResult()`, `ListResult()`), backwards-compatible schema changes
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
