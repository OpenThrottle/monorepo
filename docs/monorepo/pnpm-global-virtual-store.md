# pnpm global virtual store: evaluated, left off

**Decision: keep the default per-project virtual store (`virtualStoreType: project`).**
Evaluated against pnpm 12.14.0 in November 2026, and the blocking hook (§ 1) was re-confirmed
on 12.18.0. It works and it is faster to install, but it
saves little on macOS and it breaks the developer app's test suite in a way pnpm gives you no
switch for. This document exists so the next person who thinks "worktrees would install
faster with the global virtual store" starts from the measurements instead of from zero.

OT plan `77176469-f309-4b59-b32d-d03b1676aa55` holds the full run log and the exact spike diff.

## What it is

By default every checkout materialises its own `node_modules/.pnpm` — 2,376 entries in this
repo — and links each project's `node_modules` into it. With the global virtual store on, those
package directories live once per machine under `<store>/links/…`, and each checkout's
`node_modules` holds only symlinks into them. Every worktree then shares one tree.

In pnpm 12 the canonical key is `virtualStoreType: global`. The older
`enableGlobalVirtualStore: true` still works, but `virtualStoreType` wins when a project sets
both.

## What it would buy (measured)

Fresh install with every `node_modules` deleted and a warm content store, `--ignore-scripts`:

|                                 | default (`project`) | `global` |
| ------------------------------- | ------------------- | -------- |
| `pnpm install` wall time        | 9.4s                | 2.4s     |
| entries in `node_modules/.pnpm` | 2,376               | 5        |
| files created (inodes)          | ~162k               | ~13.6k   |

`pnpm worktree:new` takes about 26s end to end, so that is roughly 7s per new worktree.

**There is no meaningful disk win on macOS any more.** Since pnpm 12 the default isolated
install on macOS already builds each package once in the same `<store>/links` slots and
copy-on-write clones it into `node_modules/.pnpm`. A clone shares its blocks, so a second
worktree's `node_modules` costs metadata, not gigabytes. The 1.6G that `du` reports for one
checkout is apparent size. The free space on the volume barely moved between the two installs.

## Why it stays off

### 1. pnpm's injected resolve hook breaks the developer Vitest suite

With the global virtual store on, pnpm gives every process it spawns (`pnpm run`, `pnpm exec`,
and so every `pnpm nx …`) a `NODE_PATH` plus a `NODE_OPTIONS=--import=…` flag. That flag
registers a module resolve hook so phantom dependencies keep resolving. Under that hook,
Vitest's `vmForks` pool loads `@reduxjs/toolkit`'s `module-sync` export
(`redux-toolkit.modern.mjs`) as CommonJS when `recharts/lib` requires it, and the import fails
with `SyntaxError: Unexpected token 'export'`. In `openthrottle-developer`, 553 of 857 test
files fail, because nearly every route test reaches recharts through
`@openthrottle/react-router-shadcn`.

The same test file passes when Vitest runs under plain `node` with no hook. It fails under
`pnpm exec`. pnpm has no setting to turn the hook off: `--config.node-options=""` still
prepends it. That was measured on 12.14 and re-checked on 12.18.0, where `pnpm exec` in a
`virtualStoreType: global` project still sets `NODE_PATH` and the same `--import=data:…` hook.

The suite's `vmForks` pool is load-bearing for its own reasons (see the `pool` note in
`applications/openthrottle-developer/vitest.config.ts`), so switching pools to suit a local
install setting is the wrong trade.

### 2. Peer `@types` need a lockfile-wide setting

A package that peer-depends on `react` cannot see the workspace's `@types/react` from its
global slot. `cmdk` and `vaul` component props collapse, and TS7 typecheck fails in
`react-router-shadcn`. pnpm's fix is `addMissingPeerTypes: true`, but that is recorded in
`pnpm-lock.yaml` (`settings.addMissingPeerTypes`). Turning it on rewrites about 5,600 lockfile
lines of peer suffixes, and every frozen install (CI and Docker) then carries it. Re-resolving
also drifted one unrelated transitive version that had to be pinned back by hand.

### 3. A tail of phantom type imports

Some published `.d.ts` files import modules their package never declares. Today they resolve by
walking up to a hoisted directory, which a global slot does not have. Each one needs a
`packageExtensions` peer, the same pattern `pnpm-workspace.yaml` already uses for
`@bull-board/api` → `bullmq`:

| package                     | undeclared import | symptom                                                             |
| --------------------------- | ----------------- | ------------------------------------------------------------------- |
| `@golevelup/ts-vitest`      | `vitest`          | `createMock()` degrades to `any` (nestjs-repositories typecheck)    |
| `@testing-library/jest-dom` | `vitest`          | no `toBeInTheDocument` in admin/website, developer tests can't load |
| `@schedule-x/*`             | `@preact/signals` | implicit `any` in react-router-scheduling typecheck                 |

Each full gate pass (about 16 minutes uncached) surfaced new entries, so this list is not known
to be complete.

## If you retry

Revisit when pnpm can switch off the injected `NODE_OPTIONS` hook, or when Vitest `vmForks`
copes with it. Then:

- Gate on `pnpm nx run-many -t lint typecheck test --all --skip-nx-cache`, and **delete every
  `*.tsbuildinfo` first**. A buildinfo left over from a normal install lets `tsc --build` skip
  work and report a false green.
- Reproduce item 1 in one file before running the whole gate: in
  `applications/openthrottle-developer`, run
  `pnpm exec vitest run app/routes/__tests__/about.test.tsx`.
- Pin it off where it does not belong. Setting `PNPM_CONFIG_VIRTUAL_STORE_TYPE=project` in the
  environment overrides `pnpm-workspace.yaml`. `CI=true` does **not** turn it off by itself, so
  CI needs that variable written to `$GITHUB_ENV`, and the Dockerfiles need an `ENV` in their
  `base` stage.
- Removing a worktree is safe by construction. `rm -rf` deletes the symlinks and never follows
  them into the shared `<store>/links`.

To try it in one shell without touching the repo, run `export PNPM_CONFIG_VIRTUAL_STORE_TYPE=global`,
delete `node_modules`, and reinstall. Every later `pnpm` command needs the same variable. Unset
it, delete `node_modules` and reinstall to go back.
