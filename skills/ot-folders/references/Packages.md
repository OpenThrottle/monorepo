# Packages

Every package under `packages/` shares a common skeleton and then diverges by
bucket. Reproduce any of these with
`tree -L 2 -I 'node_modules|dist|build|__generated__' packages/<name>`.

## The shared skeleton

```bash
packages/<name>
├── AGENTS.md             # Agent-facing notes for this package
├── LICENSE.md
├── README.md
├── eslint.config.ts      # Where a lint rule ratchets to `error` for this package
├── package.json
├── src
│   └── index.ts            # THE public surface — see the barrel rule below
├── tests
├── tsconfig.json         # Solution config
├── tsconfig.lib.json     # Source-only build config
├── tsconfig.test.json    # Test config
├── vite.config.ts
└── vitest.config.ts
```

## The barrel rule

**`src/index.ts` is the package's entire public surface.** Consumers import the
package by name and nothing else:

```ts
import { formatPlanTitle } from '@openthrottle/react-router-utils'; // ✅
import { formatPlanTitle } from '@openthrottle/react-router-utils/src/utils/format'; // ❌
```

A deep import bypasses the barrel, defeats `@nx/dependency-checks`, and couples
the consumer to an internal path that is free to move. If something is not
exported from `index.ts`, it is not public — re-export it there rather than
reaching past it.

Exports that are genuinely public API need a JSDoc `@public` tag so Knip does not
report them as dead code.

## `nestjs-*` — server modules

`packages/nestjs-rbac`, `nestjs-auth`, `nestjs-bullmq`, `nestjs-typeorm`, …

```bash
packages/nestjs-rbac
└── src
    ├── decorators           # Parameter and method decorators
    ├── guards               # Injectable guards
    ├── index.ts             # Barrel
    ├── nestjs-rbac.module.ts  # The module, named for the package
    ├── cors.ts              # Flat modules, colocated with their tests
    ├── cors.test.ts
    ├── roles.ts
    └── roles.test.ts
```

Tests sit **beside** the file they cover (`roles.ts` / `roles.test.ts`), not in a
separate tree. No `components/` or `hooks/` — this is the `nestjs` bucket.

Server-consumed packages resolve through `dist`, so their `exports` must point at
built output, not `src`.

## `nodejs-*` — server/client agnostic

`packages/nodejs-utils`, `nodejs-graphql`

```bash
packages/nodejs-utils
└── src
    ├── config
    ├── data
    ├── index.ts
    └── utils
```

Consumed by both API and client applications, so it must import nothing
tier-specific — no NestJS, no React, no `react-router`.

## `react-router-*` — client packages

`packages/react-router-ui`, `react-router-chat`, `react-router-utils`, …

```bash
packages/react-router-ui
├── src
│   ├── components
│   ├── config
│   ├── data
│   ├── hooks
│   ├── index.css
│   ├── index.ts
│   └── utils
└── vitest.setup.ts       # Extra setup file the server-side packages don't need
```

These are **source-first**: `package.json` `main`/`types` point at `./src/index.ts`
and the consuming app's Vite transpiles them. They deliberately have **no `build`
target** — do not add one. Validate with `lint`/`typecheck`/`test`, then run `dev`
or `build` on a consumer app as the integration check.

## `react-*` — React without the router

No package in `packages/` is currently a bare `react-*`. The `technology:react`
tag exists for client code that uses React but must **never** import
`react-router`, keeping it reusable outside a router tree. Reach for it only with
a deliberate reason to stay router-free; otherwise the code is `react-router-*`.

## `react-router-shadcn` — the primitive package

```bash
packages/react-router-shadcn
├── components.json       # shadcn CLI config
├── docs/Theming.md
├── src
│   ├── commander.css
│   ├── components          # Primitive families — multi-export by design
│   ├── data
│   ├── hooks
│   ├── index.css
│   ├── index.ts
│   ├── theme.css
│   ├── themes
│   └── utils
└── tailwind.config.ts
```

The one package under the `primitive` component-shape profile rather than the
`authored` one, and the only one with `max-lines` off. It has no `config/`. See
`references/Enforcement.md`.

## `tools/*` — workspace tooling

`tools/dotfiles`, `tools/generators`, `tools/workflows`, `tools/nx-plugins`, …

```bash
tools/dotfiles
└── src
    ├── __tests__           # Tests in a folder here, not colocated
    ├── config.ts
    ├── index.ts
    ├── prettier-config.ts
    ├── rules               # The custom ESLint rules
    ├── types.d.ts
    ├── vite-config.ts
    └── vitest-config.ts
```

Same tsconfig trio as a package. `type:tool` projects may depend on both
`type:package` and `type:tool` — the only bucket allowed to depend on tools.
