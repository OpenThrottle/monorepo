# Hook primitive shape

The single, enforceable standard every authored React hook in this monorepo must
follow. It is the hook counterpart of
[component-primitive-shape.md](./component-primitive-shape.md): the generator template
is the source of truth, this document is its written contract, and the enforcers (an
ESLint rule and a repo-wide audit script) implement _this_ document.

- **Generator template (SSOT):**
  `tools/generators/src/generators/react/files/hook/__name__.tsx` and
  `tools/generators/src/generators/react-router/files/hook/__name__.tsx` (the two are
  byte-identical).
- **Scaffold a conforming hook instead of hand-writing one.**
  `react --subGenerator=hook --destination=<package>` in a package,
  `react-router --subGenerator=hook --application=<app>` in an application. The flags
  live in [AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md).

> Why a fixed shape? Hooks drifted because nothing held them to one. A file that exports
> two hooks, a helper and a module-scope constant is harder to find things in, harder to
> test, and hides values whose identity matters behind a name that looks local. One hook
> per file, with its inputs and outputs named, gives every hook the same reading order a
> component already has.

## The canonical shape

```tsx
import * as React from 'react';

export interface UseFooOptions {
  readonly initialValue: string | undefined;
}

export interface UseFooResult {
  readonly onChange: (value: string) => void;
  readonly value: string | undefined;
}

/**
 * One line on what the hook is for.
 */
export const useFoo = (options: UseFooOptions): UseFooResult => {
  const { initialValue } = options;

  // Hooks
  const [value, setValue] = React.useState(initialValue);

  // Setup

  // Handlers
  const onChange = (next: string): void => {
    setValue(next);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { onChange, value };
};
```

The interface names are the hook name in PascalCase plus `Options` / `Result`:
`useFoo` → `UseFooOptions`, `UseFooResult`. That is what the generator emits and what
117 of the existing exported hook interfaces already use.

## Rules (normative)

Each rule has a stable id so violations and lint messages can reference it.

### H1 — One hook per file, named after the file

- The file exports **exactly one** `use*` hook.
- Its name matches the file name: `useFoo` lives in `useFoo.ts` or `useFoo.tsx`.
- `export const useFoo = (…) => {…}` is the canonical form and what the generator emits.
  `export function useFoo(…) {…}` is accepted, because the two are equivalent and
  converting 40 working files buys nothing. New hooks use the const form.
- A second hook in the file, exported or not, moves to its own file. A hook that only
  exists to serve other hooks (for example `useRequiredRolloutContext`) is still a hook:
  it gets its own file in `hooks/`, and the package simply doesn't export it from
  `index.ts`.

```ts
// ❌ Bad — useHasPermission.ts exports two hooks.
export const usePermissions = (): readonly Permission[] => { … };
export const useHasPermission = (permission: Permission): boolean => { … };

// ✅ Good — two files, each with one hook.
// usePermissions.tsx
export const usePermissions = (): readonly Permission[] => { … };
// useHasPermission.ts
export const useHasPermission = (permission: Permission): boolean => { … };
```

### H2 — Export only the hook and its interfaces

A hook file exports, at most:

1. the hook (H1);
2. `export interface UseFooOptions` — its input;
3. `UseFooResult` — its return shape. This is an `interface`, or a `type` alias when the
   return value is genuinely a union or a tuple that an interface cannot express, or when
   the hook wraps a shared hook and returns its result unchanged
   (`export type UseFooResult = UseSharedFooResult`). An empty `interface … extends` would
   trip `no-empty-object-type`, so the alias is the honest form there.

Neither interface is required. A hook that takes positional arguments, or returns a
`boolean`, doesn't need one. If it has one, it uses that name.

Anything else exported from a hook file is a violation, and the message names where it
goes:

| Exported thing                                    | Goes to                                   |
| ------------------------------------------------- | ----------------------------------------- |
| Another type or interface (a row, an item, a map) | the sibling `types.ts`                    |
| A pure function                                   | the sibling `utils/`                      |
| Static data, a lookup table, a context object     | the sibling `data/` (copy → data.copy.ts) |
| A tunable (a timeout, a threshold, a page size)   | the sibling `config/`                     |
| Another hook                                      | its own file in `hooks/` (H1)             |
| A re-export (`export { … } from`, `export *`)     | the package's `index.ts`                  |

Non-exported `interface` and `type` declarations are allowed. They have no runtime value
and nobody else can depend on them.

This is the hook version of "a component exports only its component and its Props".

### H3 — No module-scope values

The module scope of a hook file holds imports, type declarations and the hook. Nothing
else: no `const`, `let` or `var`, no function or class declarations, and no side-effect
statements.

```ts
// ❌ Bad — a module-scope constant and a module-scope helper.
const NO_PERMISSIONS: readonly Permission[] = [];
const toKey = (permission: Permission): string => `${permission.scope}:${permission.action}`;

export const useHasPermission = (permission: Permission): boolean => { … };

// ✅ Good — the value lives where it is used, the helper lives in utils/.
import { toPermissionKey } from '../utils/to-permission-key';

export const useHasPermission = (permission: Permission): boolean => {
  // Hooks
  const permissions = usePermissions();

  // Setup
  const key = toPermissionKey(permission);
  …
};
```

The fix depends on who uses the value:

- **Only this hook** → declare it inside the function, under `// Setup`.
- **Several files** → move it to `data/`, `config/` or `utils/` (see the H2 table) and
  import it. The audit flags a hook-file constant that is imported elsewhere, because
  that one has already outgrown the file.

#### Stable identity: when an inline literal is fine and when it isn't

Moving a value inside the function changes one thing: an object or array literal gets
a **new identity on every render**. Primitives (strings, numbers, booleans) do not have
this problem, because they compare by value. For object and array literals, decide by
where the value goes:

1. **It stays inside this render** → declare it inline. A `[]` fallback that is only
   read, mapped or rendered doesn't need a stable identity. Example: `usePermissions`
   falls back to `[]` only when the root loader data is missing (the loader always
   returns an array), and every caller only reads it.
2. **It is derived from inputs, and its identity matters** → `React.useMemo` /
   `React.useCallback` with the real inputs as dependencies. "Matters" means it reaches a
   dependency array, a memoized child's props, or a context value.
3. **It doesn't depend on inputs, and its identity matters** → a named export in
   `data/` (static values) or `config/` (tunables), imported into the hook. Values the
   hook **returns** count here: the caller can put them in its own dependency array, so
   a `return { items: items ?? [] }` fallback is a stable `EMPTY_ITEMS` from `data/`, not
   a fresh `[]`.

Do not reach for `React.useMemo(() => [], [])` to fake a constant. React treats
`useMemo` as a performance hint and may drop the cache, and it hides a constant behind
hook machinery. A value that never changes belongs in `data/` or `config/`.

Mutable per-instance state (timer ids, the previous value, an `AbortController`) uses
`React.useRef`. Never use a module-scope `let`, which is shared by every instance of the
hook.

### H4 — The six markers, in order

The hook body contains the same six markers as a component, in the same order and with
the same whitespace rules:
`// Hooks`, `// Setup`, `// Handlers`, `// Markup`, `// Life Cycle`, `// 🔌 Short Circuit`.
Each marker is preceded by exactly one blank line, and every marker stays even when its
section is empty. See component R3 for the semantics of each section. `// Markup` is
usually empty in a hook, and it stays.

Input unpacking (`const { … } = options;`) goes before `// Hooks`, exactly as props do
in a component.

### H5 — An explicit return type

The exported hook declares its return type: `(options: UseFooOptions): UseFooResult`,
`(): boolean`, or `(): void` for an effect-only hook. Never an inferred return type.
An inferred return silently widens when the body changes, and the return type is the
hook's contract with every caller.

### H6 — Naming and placement

- The file name is camelCase, `useFoo.ts` or `useFoo.tsx`, never kebab-case
  (`use-foo.ts`).
- The file lives in a `hooks/` folder.
- An exported `use*` hook anywhere else (a `components/` folder, a route, a `utils/`
  file) moves into the nearest sibling `hooks/` folder.

## Edge cases

- **A context hook next to its Provider** — split them. The Provider is a component and
  follows the component shape in `components/`. The context object
  (`React.createContext(…)`) is a module-scope value, so it lives in `data/` (as
  `packages/react-router-rollout/src/data` already does with `RolloutContext`). The hook
  that reads it lives in `hooks/`. Three kinds of thing, three files.
- **A shared "required context" helper hook** — when several public hooks share an
  internal `useRequiredFooContext(hookName)` that throws outside the Provider, it is a
  hook. It gets its own file and is left out of `index.ts`.
- **Generic hooks** — write the type parameter as `<TValue,>` in a `.tsx` file
  (`export const useFoo = <TValue,>(options: UseFooOptions<TValue>): UseFooResult<TValue> => {…}`).
  The trailing comma stops the parser reading it as JSX.
- **Hooks that take positional arguments** — allowed. `useDebouncedValue(value, delayMs)`
  doesn't need an Options interface (H2 only constrains its name if it has one).

## Scope

The ESLint rule applies to `**/hooks/use*.{ts,tsx}` in `applications/*` and `packages/*`.
The audit sweeps every `.ts`/`.tsx` file under `applications/*/app` and
`packages/*/src` for H6. Both exclude:

- `**/dist/**`, `**/__generated__/**` — build and codegen output.
- `**/__tests__/**`, `**/*.test.ts(x)`, `**/*.stories.tsx` — tests and stories.
- `packages/react-router-shadcn/**` — **vendored** shadcn/ui code, which includes its own
  hooks (`useSidebar`, `useIsMobile`). It is held to the shadcn variant standard
  ([component-shape-shadcn-variant.md](./component-shape-shadcn-variant.md)), not this
  one, for the same reason: re-syncing from upstream must stay a diff, not a rewrite.

A hook copied from another upstream source and kept verbatim on purpose takes the
opt-out below, with the source named in the reason.

## Opt-out — last resort

A file-top block comment on line 1:

```ts
/* hook-shape: opt-out — <written reason> */
```

Both enforcers honor it. It needs a written reason and is expected to see near-zero use.
"It's a tiny hook" and "I'll fix it later" are not reasons. Those files conform.

### Currently-exempt files

_None._

## Who enforces what

| Rule                                     | Enforcer                   | Why there                                                                                                                                            |
| ---------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1 — one hook, named after the file      | ESLint                     | single-file                                                                                                                                          |
| H2 — exports                             | ESLint                     | single-file                                                                                                                                          |
| H3 — module-scope values                 | ESLint                     | single-file                                                                                                                                          |
| H3 — a hook-file constant used elsewhere | Audit                      | needs the importers, so it is cross-file                                                                                                             |
| H4 — markers                             | ESLint (autofix scaffolds) | single-file                                                                                                                                          |
| H5 — return type                         | ESLint                     | single-file                                                                                                                                          |
| H6 — camelCase file name                 | Audit                      | kept with placement, so "where and what is it called" is one report; H1 compares against the camelCased name, so a kebab file is not double-reported |
| H6 — `use*` hook outside `hooks/`        | Audit                      | outside the ESLint rule's glob by definition                                                                                                         |

- **ESLint rule** `openthrottle/hook-primitive-shape`, in
  `tools/dotfiles/src/rules/hook-primitive-shape.ts`. It shares the marker list and the
  file-name helper with `component-primitive-shape` so the two cannot drift.
- **Audit script** `pnpm run audit:hook-shape` (`scripts/audit-hook-shape.ts`).
  `audit:hook-shape:strict` runs as part of `audit:strict`.
