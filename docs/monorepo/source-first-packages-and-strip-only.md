# Source-first packages and Node's strip-only loader

A package is **source-first** when its `exports` name `./src/` — consumers get its
TypeScript and transpile it themselves, rather than reading a built `dist/`. That is the
workspace norm for libraries with no `build` target (see
[MONOREPO.md § Projects without a `build` target](../../MONOREPO.md#projects-without-a-build-target)).

It carries one constraint, and this document exists because the constraint is invisible at
the point where you would violate it. One whole tag is exempt from the pattern by rule
rather than by measurement — see
[`technology:nestjs` is built, as a blanket rule](#technologynestjs-is-built-as-a-blanket-rule).

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
`@openthrottle/nestjs-repositories`, whose `exports` name `./dist/`. That emitted dist
statically imports the source-first package:

```js
// packages/nestjs-repositories/dist/src/database.config.js
import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
```

That `import` runs inside a module Node already owns, so **Node's resolver** handles it. It
reads the source-first `exports`, gets `./src/index.ts`, and hands raw TypeScript to the
strip-only loader.

> **This example used to be a CommonJS `require()`.** The nestjs tier emitted CJS until the
> NestJS 12 / ESM migration; the line above was
> `const openthrottle_agentic_utils_1 = require('@openthrottle/openthrottle-agentic-utils')`.
> **The module format was never the cause**, and switching it changed nothing. Re-measured
> after the migration by adding one parameter property to
> `@openthrottle/openthrottle-agentic-utils` and importing `nestjs-repositories`' built dist:
>
> ```
> SyntaxError: TypeScript parameter property is not supported in strip-only mode
> ```
>
> Byte-identical to the message the `require()` version produced. What matters is that
> **some** already-emitted module resolves a source-first package through Node's own
> resolver — `import` and `require` reach the same strip-only loader.

## Two limits the ESM migration measured

Both were found while migrating the nestjs tier to ESM, and both are properties of the
source-first shape rather than of any package.

**A source-first package cannot be loaded from `node_modules` in a production image.** Node
refuses to type-strip anything under `node_modules` at all — a stricter rule than the
strip-only constructs above, and not a flag that can be flipped:

```
ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING: Stripping types is currently unsupported for
files under node_modules, for ".../openthrottle-agentic-utils/src/index.ts"
```

This is **not** ESM-specific — a CommonJS `require()` of the same package in the same image
fails with the identical code. It means the `exports`-name-source shape works in the
workspace (where packages are symlinked and resolved as workspace paths) and does not
survive into a pruned deploy tree. `openthrottle-server` has ten source-first runtime
dependencies, so this is a packaging question, not a per-package one; it is tracked
separately.

**`rewriteRelativeImportExtensions` does not rewrite declaration files.** A built ESM
package's `.js` emit gets `./x.js`, but its `.d.ts` keeps `./x.ts`:

```ts
// packages/nestjs-utils/dist/src/index.d.ts
export * from './config/index.ts';
```

In-repo consumers resolve it because `allowImportingTsExtensions` is on workspace-wide, and
`scripts/check-nodenext-references.ts` passes. An **external** consumer of a published
`@openthrottle/*` package without that flag would not.

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

#### The one opt-out

`"erasableSyntaxOnly": false` appears in exactly one place, for a reason that does not
apply to source-first packages: **the decorated tier** — `tsconfig.nestjs.json` and
`tsconfig.nestjs-package.json` (31 projects). NestJS dependency injection _is_ constructor
parameter properties; `openthrottle-server` alone has 394 of them. These projects ship
built JavaScript, so nothing ever hands a consumer their raw TypeScript.

##### History: the six codegen opt-outs, and how they were closed

There used to be a second exemption, covering six projects whose program included GraphQL
Codegen output — `openthrottle-developer`, `openthrottle-admin`, `openthrottle-agentic-ralph`,
`openthrottle-mcp`, `openthrottle-developer-codegen`, and `react-router-ui-global`. Codegen
emitted `export enum` into `__generated__/graphql.ts`, a compiler flag cannot be scoped to
exclude a directory, and nothing can lint a file codegen overwrites — so generated code was
the one place the repo's own "no new enums" rule was unenforceable, and a per-project
opt-out was the only lever left.

`enumsAsConst` in the shared `defineCodegen` preset closed it. Generated enums are now
`as const` objects with a matching type alias, which keeps both value and type positions
working, so all six opt-outs are gone. Two details are worth keeping:

- `enumsAsConst` is a `@graphql-codegen/typescript` **plugin** option. Set in the client
  preset's `presetConfig` it is silently ignored — no warning, no error, identical output —
  so it lives in the output entry's `config` block instead.
- The migration was expected to cost 200+ call sites and broke none. All the generated enums
  are string-valued, and a string enum has no reverse mapping to lose; `Object.values` on one
  returns the same array either way. The reverse-mapping hazard is real only for **numeric**
  enums.

`openthrottle-mcp` was the exception: its opt-out had a second cause nobody had recorded — a
lone NestJS constructor parameter property in `NestjsMcpDeveloperService`. It extends
`tsconfig.esm.json` rather than the decorated tier, so it carried its own copy of the flag.
That one site now assigns the field in the constructor body (Nest resolves the dependency
from `design:paramtypes`, which the constructor signature still provides).

##### The hazard `react-router-ui-global` illustrates

`react-router-ui-global` was the instructive member of that set, and the reason it needed an
exemption outlives the enums. It holds no generated file of its own. It consumes
`@openthrottle/openthrottle-developer-codegen`, whose `main`/`module`/`types` name `./src/`
with no `exports` field at all — so that package's source is compiled _in its consumers'
programs, under their options_. Whatever non-erasable syntax such a package carries, the
error surfaces in a consumer that did not write it, and any exemption has to follow the
program rather than the file. That remains true, and it is a latent instance of the hazard
this document describes: source-first by `main` rather than by `exports`.

The exemption does not overlap the source-first set, which is the point: every package whose
`exports` name `./src/` is covered, and the exemption is where the constructs are both
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

No `nestjs-*` package appears here, and none can: see below.

## `technology:nestjs` is built, as a blanket rule

Every package tagged `technology:nestjs` points `main`, `module`, `types` and every
`exports` condition at built output, and declares live `build` **and** `dev` targets.

The `dev` half matters as much as the build: `openthrottle-server:dev` cascades `^dev` to
its dependencies, so a package whose `dev` is parked as `__dev` gets no watcher. Edit it and
the `dist/` its own entry fields name goes stale under you while the server keeps serving
the old build — silently, with no error anywhere. Four of the five packages that were
missing a live `dev` had been parked that way since the initial port rather than by any
decision, which is exactly the kind of drift the gate now catches.
`scripts/check-package-entrypoints.ts` enforces this from `package.json` alone and errors
on any violation.

No package is exempt. The gate's `NESTJS_BLOCKERS` map exists and is empty, which is the
intended steady state; it is shrink-only on the same terms as the baseline above, so a
listed package that stops violating is itself an error.

### Four packages could be source-first today. They are built anyway, deliberately.

A decorator and constructor-parameter-property scan across the tier found **four** with zero
of both: `nestjs-langchain`, `nestjs-mcp-developer`, `nestjs-testing` and `nestjs-utils`.
They satisfy the constraint above and could drop their build targets. They do not, and the
rule stays keyed on the tag rather than on measured contents:

- **The exemption is one commit from being wrong.** Any of the four gains a single
  `@Injectable()` and it becomes a source-first package containing a decorator — precisely
  the failure this document exists to prevent, and one whose error names neither the cause
  nor the package.
- **It would split the tier's config.** Four packages on `erasableSyntaxOnly: true` outside
  `tsconfig.nestjs-package.json` and the rest inside it means "where does this package's
  config come from" stops having one answer.
- **The saving is four `@nx/js:tsc` invocations**, every one of them Nx-cached.

The measurement is recorded so it is not repeated and mistaken for a finding. (The NestJS 12
plan recorded _three_; it scanned only the CommonJS manifests, and `nestjs-mcp-developer` was
already ESM.)

### What the last exemption taught us about source-first ESM packages

`@openthrottle/nestjs-agentic-workflow` was the final holdout, and the two defects behind it
were both in `@openthrottle/openthrottle-agentic-ralph` — a source-first **ESM** package.
Neither was visible until something resolved ralph from _built_ code, and both are now
prevented at the codegen config rather than fixed per package:

1. **`.js` specifiers in a source-first package.** ralph's `codegen.ts` set
   `importExtension: '.js'`, and a dozen hand-written files followed suit. That is correct
   for an ESM package that is **built** (`@openthrottle/openthrottle-mcp` — NodeNext source
   must name the emitted `.js`) and wrong for one that is **source-first**, where consumers
   read the TypeScript and the `.js` file never exists. Pick `importExtension` from how the
   package is _consumed_, not from its `type` field. The Zod-schema block in `defineCodegen`
   hardcoded `importFrom: './graphql.js'` and ignored the setting; it now follows it.

2. **A types-only package emitted as a value import.**
   `@graphql-typed-document-node/core` has `"main": ""` and ships nothing but
   `typings/index.d.ts`. Codegen emitted `import { TypedDocumentNode ... }`, and Node's
   strip-only loader erases type _annotations_ but never removes an import that looks like a
   value — so the statement survived and resolution failed with `Cannot find package`,
   naming the package rather than the generated file importing it. Declaring the dependency
   does not help: there is no runtime entry to resolve. `useTypeImports: true` is now set in
   the shared config, so the import erases at the source level.

The shared lesson: a bundler-only consumer hides both of these indefinitely. They surface
the first time a built consumer resolves the package, which can be years after the code was
written.

**The rule is keyed on the tag, not on a scan for the constructs above.** That is
deliberate, and it is the part worth understanding before you argue with it:

- **Construct-freedom is not stable.** A package named `nestjs-*` acquires its first
  `@Injectable()` eventually. On a per-package rule, the day it does is the day the
  package silently becomes wrong, with nothing to catch it.
- **The construct scan is only one of three conditions.** A package is safe to make
  source-first only if it carries no strip-only constructs, **and** no CommonJS
  `require()` chain reaches it, **and** no live build target emits declarations consumers
  read. Only the first is mechanically checkable. `@openthrottle/nestjs-utils` passed the
  construct scan on all four forms — in sources and tests — and moving it to source-first
  still broke 16 test projects, because it is reached through a CJS `require()` chain and
  NestJS compiles to CJS. That hazard is a property of the **consumer graph** and is
  invisible to any scan of the package's own source.
- **The uniform arrangement is the proven one.** Before the tag rule landed, all 26
  `nestjs-*` packages already resolved to `dist` through `exports` and the workspace was
  green. The source-first carve-outs were the novel state, not the built one.

So a `nestjs-*` package that happens to contain zero decorators — a thin re-export shim, a
test harness, a wrapper around a non-Nest library — is still built. Its cleanliness is
incidental rather than architectural, and trading a rule you can read off `package.json`
for one that needs a whole-graph reachability analysis is a bad trade.

### The exit

**That flip is never coming, and this is the record of why.** An earlier version of this
document said the whole tag would flip to source-first "when NestJS supports ESM". NestJS 12
supports ESM, the tier migrated to it, and **not one package became source-first-able** —
because Node's loader is strip-only and decorators and constructor parameter properties both
require _emitted_ code. That is a property of the loader, not of the module format. Do not
re-open this on the basis that the tier is now ESM; it was evaluated and the answer was
zero reclaimed build steps.

## If you are flipping a package to source-first

This procedure does **not** apply to `technology:nestjs` packages — those are built by
blanket rule, and the gate will reject the flip.

1. Run `typecheck`. `erasableSyntaxOnly` will fail on any parameter property, `enum` or
   `namespace` in the package before it ever reaches a consumer.
2. Add `sourceFirstEslintConfig` to the package's `eslint.config.ts` if a CJS-resolvable
   condition (`require`, or a bare/`default` string) names source, and run `lint`. If it
   reports decorators, the package cannot be source-first on that condition — leave
   `require`/`default` on built output.
3. `@openthrottle/nodejs-utils` has 24 consumers — the largest blast radius in the
   workspace.
