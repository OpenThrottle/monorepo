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
negative result is the reason this document recommends a gate instead:

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

## The gate

`scripts/check-package-entrypoints.ts` (Nx target `monorepo:check-package-entrypoints`)
parses every exposed package's `src/` with the TypeScript compiler API and reports these
constructs. Severity follows **which condition** names source, because that decides which
resolver hands Node TypeScript:

- **error** — a CJS-resolvable condition (`require`, or a bare/`default` string) names
  source. Every Node resolution of the package, `require()` included, gets raw TypeScript.
  Six packages are in this bucket today: `agentic-hooks`, `node-client`,
  `openthrottle-agentic-utils`, `openthrottle-ide`, `openthrottle-showroom`, and
  `@tools/dotfiles`. All are clean, and the gate keeps them that way.
- **warn** — only the `import` condition names source, with `require` pointing at built
  output. A Node ESM `import` would still hit the loader, but the CJS path is safe.
  `nestjs-agentic-workflow` and `nestjs-openthrottle-mcp` are here, and cannot leave:
  NestJS _is_ decorators, so the only way to clear the warning is to stop pointing
  `import` at source.

Run `--verbose` to list warnings individually.

## If you are flipping a package to source-first

1. Run the gate. If it errors, the package is not ready — fix the constructs or leave
   `require`/`default` on built output.
2. Remember that a _consumer_ flipping is not the only trigger: a package already
   source-first becomes hazardous the moment someone adds one of these constructs to it,
   which is precisely what the gate now catches.
3. `@openthrottle/nodejs-utils` has 24 consumers — the largest blast radius in the
   workspace. Land the gate before flipping it.
