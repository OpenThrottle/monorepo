# ESM import extensions, and why a bundler does not remove them

**Decision: keep `@nx/js:tsc` and the explicit `.ts` relative-import extensions.**
Evaluated against tsdown and rolldown, September 2026. Both were measured, both work, and
neither is worth adopting. This document exists so the extensions stop reading as an
unexamined default — they are a deliberate choice with the alternatives priced out.

OT plan `37510d22-d756-4da3-8d78-9d5aa9af73b5` holds the full run log.

## The thing that looks like a problem

Twelve packages are `"type": "module"` + `moduleResolution: nodenext`:
`agentic-hooks`, `nestjs-graphql`, `nestjs-mcp-developer`, `node-client`, `nodejs-graphql`,
`openthrottle-agentic-utils`, `openthrottle-ide`, `openthrottle-mcp`,
`openthrottle-notifications`, `openthrottle-showroom`, `tools/dotfiles`,
`tools/ollama-proxy`. Four of them emit: `nestjs-graphql`, `nestjs-mcp-developer`,
`openthrottle-mcp`, `ollama-proxy`.

In those packages every relative specifier carries the source extension — `./foo.ts`, which
`tsc` ships as `./foo.js`. That is not style. Node's ESM resolver does no extension
searching, and `tsc` never invents a specifier it was not given
(`rewriteRelativeImportExtensions` only maps a `.ts` you wrote down), so under `nodenext`
an extensionless relative import is `TS2835` at `typecheck`.

## The trap you will find if you try to remove them with tsconfig alone

Switching the tier to `module: esnext` + `moduleResolution: bundler` and stripping every
extension **passes `typecheck` and passes `build`**. It also incidentally resolves the
`@apollo/server` cjs/esm dual-types clash, because bundler resolution takes the `import`
condition. It looks like a clean win.

It is dead at runtime:

```
node -e "import('./dist/src/index.js')"
→ ERR_MODULE_NOT_FOUND  './config/format-error'
```

`tsc` emits the extensionless specifier verbatim; nothing rewrites it. So that
configuration is **green in CI and broken in production**.

The rule this leaves behind: **any replacement for the extensions must be validated by
loading the built output, not by a green `nx build`.** The `react-router-*` tier escapes
extensions only because it never emits at all — source-first, transpiled by the consuming
app's Vite. That does not transfer to a package the NestJS server loads from `dist`.

## What was measured

Subject: `packages/nestjs-graphql`, 10 source files. darwin-arm64, Node 24.15.0,
tsdown 0.23.0, rolldown 1.2.8, oxc runtime 0.149.0.

**The repo's `tsc` is TypeScript 7.0.2 — the native compiler** (`$OPENTHROTTLE_TSC_BIN`,
see [NX.md](./NX.md)). Read every row below with that in mind: the incumbent is not the
slow `tsc` a bundler is usually pitched against.

| Axis                                 | `@nx/js:tsc` (TS 7.0.2)  | tsdown 0.23.0                                  | rolldown 1.2.8           |
| ------------------------------------ | ------------------------ | ---------------------------------------------- | ------------------------ |
| `design:paramtypes` preserved        | yes                      | yes                                            | yes                      |
| `.d.ts` emit                         | 10/10                    | 10/10                                          | **0 — none at all**      |
| `.d.ts.map` (`declarationMap` is on) | 10/10                    | **8/10**                                       | n/a                      |
| `.js.map`                            | 10/10                    | 8/10                                           | 8/10                     |
| Cold full build (best of 3)          | **0.18s**                | 1.07s with dts, 0.16s without                  | 0.18s                    |
| Watch rebuild, real edit (×3)        | 0.09 / 1.10 / 1.18s      | 0.10 / 0.09 / 0.04s                            | 0.11 / 0.09 / 0.10s      |
| `import('./dist/src/index.js')`      | OK                       | OK                                             | OK                       |
| Nx executor                          | first-party `@nx/js:tsc` | none → `nx:run-commands`                       | none → `nx:run-commands` |
| `dist/src/` layout out of the box    | yes, from `rootDir`      | no — needs `outDir` + `outExtensions` override | no                       |

Watch latency is the only axis a bundler wins, and it wins by under 1.1 seconds.

### `emitDecoratorMetadata` survives both — this was the blocking unknown, and it passed

`tsconfig.nestjs-package.json` sets `emitDecoratorMetadata`, and NestJS constructor DI is
built on it. esbuild does not support it at all, which is why `@nx/esbuild` was never in
scope. oxc — the transform under both tsdown and rolldown — does support it.

Be careful how you check this. **`packages/nestjs-graphql` is a weak surface for the
question**: neither `NestjsGraphqlModule` nor `PubSubModule` has a constructor, so its
`@nx/js:tsc` output contains `__decorate` but **zero** `__metadata` calls. Grepping that
package would have produced a false pass in either direction.

Checked against a constructor-injected fixture instead:

```js
// tsc
__metadata('design:paramtypes', [DepService]);

// tsdown and rolldown (byte-identical to each other)
__decorateMetadata('design:paramtypes', [
  typeof DepService === 'undefined' ? Object : DepService,
]);
```

The oxc form is strictly better than tsc's — the `typeof` guard makes it circular-import
safe, which is a real NestJS failure mode that tsc's bare reference has. All three
resolved under a real `NestFactory.createApplicationContext`. `openthrottle-server` then
booted against a tsdown-built `@openthrottle/nestjs-graphql` with **zero**
`Nest can't resolve dependencies`, and `POST /graphql` answered `200`.

(If you reproduce this: pass `abortOnError: false`, or Nest `process.exit(1)`s silently
when the logger is off and you will chase a blank failure.)

So decorator metadata is **not** why the answer is no.

## Why the answer is no anyway

### rolldown alone cannot ship a package

Zero declaration files. Types would need a separate `tsc --emitDeclarationOnly` pass — the
very thing being replaced — and at TS7 speed that pass _is_ the whole build. rolldown-direct
is strictly dominated by tsdown, which is strictly dominated by tsc.

### `build` is not the only producer of `dist/`

This is the finding that closes the question. `tools/nx-plugins/package-typecheck.ts` gives
the `typecheck` target these outputs:

```
'{projectRoot}/dist/**/*.d.ts'
'{projectRoot}/dist/**/*.d.ts.map'
'{projectRoot}/dist/**/*.tsbuildinfo'
```

and runs `tsc --build tsconfig.json --emitDeclarationOnly`. These packages are
`composite: true` and reached through tsconfig project references, so `--build` rebuilds
the referenced project **fully, `.js` included**, whatever `--emitDeclarationOnly` says
about the root project.

Observed, not inferred:

1. `rm -rf dist && tsdown` → 37 files. `dist/src/modules/nestjs-graphql.module.js` opens
   `import { createFormatError } from "../config/format-error.js"` (oxc).
2. `pnpm nx run openthrottle-server:typecheck` → 45 files. The **same** file now opens
   `var NestjsGraphqlModule_1; import { __decorate } from "tslib"` (tsc), and oxc's
   `_virtual/_@oxc-project_runtime@0.149.0/helpers/esm/` tree is gone.

With a bundler `build`, the bytes the server loads depend on which target ran last, and two
separately-cached Nx targets restore conflicting content into one directory. Setting
`dts: false` on the bundler does not help — the clobbering comes from the project-reference
rebuild, not from the declaration flag. The only escape is taking these packages out of
`composite` / project references, which is a far larger change than the one being bought.

**A bundler would be additive, not a replacement.** `tsc` stays in the pipeline via
`typecheck` either way.

### The thing being bought is already free

The extensions are not hand-typed. Those packages spread `nodeEsmEslintConfig` from
`@tools/dotfiles` and `eslint --fix` writes them.

## `nodeEsmEslintConfig` needs its resolver — do not drop it

`import-x/extensions` cannot see the file behind `./foo` without a resolver, so `extension`
falls back to `path.extname(importPath)`. In this repo that **silently passes every dotted
filename** — `./pubsub.constants` "already has" a `.constants` extension — and downgrades
the rest to a suggestion with no fixer. That is why the config ships
`createNodeResolver({ extensions: ['.ts', '.tsx', '.js', '.jsx'] })` under
`import-x/resolver-next`. With it, all 23 specifiers in `nestjs-graphql` report and all 23
fix.

The normative version of this note lives on `nodeEsmEslintConfig` itself in
`tools/dotfiles/src/index.ts`; it is repeated here because it is the load-bearing reason
the "extensions are free" claim above holds.

## If you want to revisit this

The two things that would actually change the answer:

- These packages stop being `composite` project-reference projects, so `build` regains sole
  ownership of `dist/`.
- A first-party Nx executor for tsdown or rolldown appears, with composite-aware
  declaration output.

Neither is true today. Bring measurements, not ergonomics.

## See also

- [AGENTS.md](../../AGENTS.md) § Code style — the normative extension rule
- [code-style.md](./code-style.md) — rationale for the rules AGENTS.md lists
- [source-first-packages-and-strip-only.md](./source-first-packages-and-strip-only.md) —
  why the `react-router-*` tier has no extensions and no `build`
- [NX.md](./NX.md) — `nx sync`, project references, and the `tsc` / `tsc6` compiler knob
