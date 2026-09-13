# Source-first packages and Node's strip-only loader

A package is **source-first** when its `exports` name `./src/` — consumers get its
TypeScript and transpile it themselves, rather than reading a built `dist/`. That is the
workspace norm for libraries with no `build` target (see
[MONOREPO.md § Projects without a `build` target](../../MONOREPO.md#projects-without-a-build-target)).

It carries one constraint, and this document exists because the constraint is invisible at
the point where you would violate it.

## The constraint

**A source-first package cannot use constructor parameter properties, `enum`, decorators,
or `namespace` blocks.**

Node can run `.ts` files directly, but only by _erasing_ types — it never _emits_ code. Any
construct whose semantics require generated output is rejected outright rather than
mis-compiled:

| Construct                               | Why erasure is not enough                              |
| --------------------------------------- | ------------------------------------------------------ |
| `constructor(private readonly x: T) {}` | implies a generated `this.x = x` assignment            |
| `enum`, `const enum`                    | implies a generated runtime object and reverse mapping |
| decorators                              | implies a generated call wrapping the declaration      |
| `namespace` / `module` blocks           | implies a generated IIFE and object merge              |

Type-only forms are fine: `interface`, `type`, `abstract`, `declare namespace`, and
`.d.ts` files all erase cleanly. So does an `as const` object, which is the repo's
sanctioned replacement for `enum` anyway.

## Why the failure is so hard to read

Three properties make this worth a document rather than a comment.

**The blast radius is not local.** The construct is added to package A; the failure appears
in package B's test run. Adding one parameter property to
`@openthrottle/openthrottle-agentic-utils` took `@openthrottle/node-client` from **28
passing tests to 13** — a package whose own manifest and source were untouched.

**The error names neither cause.**

```
SyntaxError: TypeScript parameter property is not supported in strip-only mode
```

That mentions no package, no file, no `exports`, and gives no hint that a resolution
decision made in a third package is why Node is reading TypeScript at all.

**The path is not the obvious one.** `node-client`'s test imports
`@openthrottle/nestjs-repositories`, whose `exports` name `./dist/` and whose emitted dist
is CommonJS:

```js
// packages/nestjs-repositories/dist/src/database.config.js
const openthrottle_agentic_utils_1 = require('@openthrottle/openthrottle-agentic-utils');
```

That `require()` runs inside a module Node already owns, so **Node's resolver** handles it.
It reads the source-first `exports`, gets `./src/index.ts`, and hands raw TypeScript to the
strip-only loader.

## What does not fix it

**Vitest's `server.deps.inline` does not fix it.** This was measured, not assumed, and the
negative result is the reason the constraint is enforced at authoring time instead:

- A test module that imports a source-first package **directly** already works with no
  configuration. Vite does not externalize a workspace import that resolves to a `.ts`
  file — it transforms it. There was never a failure here to fix.
- The failure above arrives through a `require()` from an already-externalized CommonJS
  module, which Vite never sees. Setting `server.deps.inline: true` — inline _everything_ —
  leaves it exactly as red.

More generally: this is a property of **Node's loader**, not of any test runner's
configuration. A plain `node -e "require('@openthrottle/openthrottle-agentic-utils')"`
reproduces it with no runner in the picture. Nothing you can put in a Vitest config lifts
it.

## What does fix it

Write the erasable form. The fixes are mechanical:

```ts
// ✗ parameter property
class Cache {
  constructor(private readonly now: () => number) {}
}

// ✓ declare the field, assign in the body
class Cache {
  private readonly now: () => number;

  constructor(now: () => number) {
    this.now = now;
  }
}
```

```ts
// ✗ enum                          // ✓ as const object (the repo's rule anyway)
enum Status {
  ACTIVE = 'ACTIVE',
}
const STATUS = { ACTIVE: 'ACTIVE' } as const;
type Status = (typeof STATUS)[keyof typeof STATUS];
```

For decorators and `namespace` there is no erasable rewrite — a package that needs them
must not be source-first. Point its `require`/`default` conditions at built output.

## How it is enforced

Two mechanisms, split by what each can see.

### `erasableSyntaxOnly` — parameter properties, `enum`, `namespace`

`tsconfig.base.json` sets [`erasableSyntaxOnly`](https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly),
so `tsc` rejects exactly the syntax Node's loader cannot erase:

```
error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

It is set in `tsconfig.base.json` — **repo-wide rather than per source-first package**,
deliberately. The alternative, binding it to the set of packages whose `exports` name
`./src/`, recreates the drift it is meant to remove: the next package to flip would need
someone to remember the flag, and something custom would have to check that they had.
Repo-wide, the default is on and the exceptions are explicit.

It also catches `import x = require('...')`, which is non-erasable for the same reason.

#### The two opt-outs

`"erasableSyntaxOnly": false` appears in exactly two places, both for reasons that do not
apply to source-first packages:

1. **The decorated tier** — `tsconfig.nestjs.json` and `tsconfig.nestjs-package.json`
   (31 projects). NestJS dependency injection _is_ constructor parameter properties;
   `openthrottle-server` alone has 394 of them. These projects ship built JavaScript, so
   nothing ever hands a consumer their raw TypeScript.
2. **Projects whose program includes GraphQL Codegen output** — `openthrottle-developer`,
   `openthrottle-admin`, `openthrottle-agentic-ralph`, `openthrottle-mcp`,
   `openthrottle-developer-codegen`, and `react-router-ui-global`. Codegen emits
   `export enum` into `__generated__/graphql.ts`, and a compiler flag cannot be scoped to
   exclude a directory. The durable fix is `enumsAsConst` in the shared codegen preset,
   which would also serve the repo's own "no new enums" rule — but that is a cross-consumer
   migration (18 enums, 200+ call sites), not a silent flip.

   `react-router-ui-global` is the instructive one: it holds no generated file of its own.
   It consumes `@openthrottle/openthrottle-developer-codegen`, whose `main`/`module`/`types`
   name `./src/` with no `exports` field at all — so that package's generated enums are
   compiled _in its consumers' programs, under their options_. The exemption has to follow
   the program, not the file. That package is also a latent instance of the hazard this
   document describes: source-first by `main` rather than by `exports`, and shipping enums.

Neither exemption overlaps the source-first set, which is the point: every package whose
`exports` name `./src/` is covered, and the exemptions are where the constructs are both
necessary and harmless.

### ESLint — decorators

`erasableSyntaxOnly` does **not** flag decorators. They are equally unemittable, but the
entire NestJS surface is built out of them, so the compiler flag cannot be the mechanism.

Instead, each source-first package spreads `sourceFirstEslintConfig` (from `@tools/dotfiles`)
after `eslintConfig` in its own `eslint.config.ts`, which bans the `Decorator` node with a
message naming the whole chain. It is scoped per package because the restriction is a
property of the `exports` decision, not of the language:

| Package                                    | Why                    |
| ------------------------------------------ | ---------------------- |
| `@openthrottle/agentic-hooks`              | `default` names source |
| `@openthrottle/node-client`                | `default` names source |
| `@openthrottle/openthrottle-agentic-utils` | `default` names source |
| `@openthrottle/openthrottle-ide`           | `default` names source |
| `@openthrottle/openthrottle-showroom`      | `default` names source |
| `@tools/dotfiles`                          | `default` names source |

Severity follows **which condition** names source, because that decides which resolver hands
Node TypeScript. The six above are the `error` tier: a CJS-resolvable condition (`require`,
or a bare/`default` string) names source, so every Node resolution of the package —
`require()` included — gets raw TypeScript.

`@openthrottle/nestjs-agentic-workflow` and `@openthrottle/nestjs-openthrottle-mcp` are the
remaining source-first packages, and they are **not** in the list. Only their `import`
condition names source; `require` points at built output, so the CJS path that actually
bites today is safe. A Node ESM `import` of either would still hit the loader. They cannot
be moved into the list — NestJS _is_ decorators — so the only way to close that gap is to
stop pointing their `import` condition at `./src/`.

## If you are flipping a package to source-first

1. Run `typecheck`. `erasableSyntaxOnly` will fail on any parameter property, `enum` or
   `namespace` in the package before it ever reaches a consumer.
2. Add `sourceFirstEslintConfig` to the package's `eslint.config.ts` if a CJS-resolvable
   condition (`require`, or a bare/`default` string) names source, and run `lint`. If it
   reports decorators, the package cannot be source-first on that condition — leave
   `require`/`default` on built output.
3. `@openthrottle/nodejs-utils` has 24 consumers — the largest blast radius in the
   workspace.
