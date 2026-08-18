# openthrottle-developer Vitest pool: `vmForks` + `vmMemoryLimit`

**Status:** shipped (OT plan `e448a51d-b131-4e06-b9c3-0e50b03eac36`)
**Applies to:** `applications/openthrottle-developer` — its ~364-file / ~1,615-test jsdom Vitest suite, the heaviest `test` target in CI.
**Follow-up to:** the idle-timeout PR (#264 / `chat-idle-timeout-retry.md`), where the pool crash first surfaced.

## Problem recap

The developer suite ran on `pool: 'vmForks'` for speed. Under the 4-vCPU CI
box's memory ceiling the reused vmForks worker accumulated V8 VM contexts across
the whole suite and got SIGKILLed mid-file — surfacing as in-flight files
reporting `(0 test)` with no error stack and no Vitest summary: a silent
container OOM, **not** a V8 heap error and **not** a real assertion failure. It
was flaky and non-deterministic (seen on run 30667852303: 4 unrelated
`plans.$planId._index*` + `PlanWorkflowRunTransparency` files).

The immediate mitigation (PR #264) switched to `pool: 'forks'`, which re-imports
the module graph per file (so it accumulates far less and is stable) but is much
slower — wall-clock regressed ~90s → ~340s.

## Decision — keep `vmForks`, bound it with `vmMemoryLimit`

`applications/openthrottle-developer/vitest.config.ts`:

```ts
maxWorkers: 4,
pool: 'vmForks',
vmMemoryLimit: '512MB',
```

`vmForks` reuses the worker process, so the module graph is imported once per
worker and amortized across the files it handles — the wall-clock win. The OOM
was unbounded _accumulation_ in that reused worker, so bound it:
`test.vmMemoryLimit` makes Vitest recycle a worker once its heap crosses the
limit, capping accumulation at ~512MB/worker (≈4×512MB peak, far under the box)
while keeping the import amortization.

If the `(0 test)` OOM ever reappears, **lower `vmMemoryLimit`** (more frequent
recycles) before touching `maxWorkers` or the box size. Do not raise
`--max-old-space-size` — it fights the box limit, not the accumulation.

## Why config-only, not sharding

The plan was titled "shard the suite," and the config-only route was still the
right one — but the original reason has since expired, so read the current one.

**Then:** CI ran the whole affected set on one `blacksmith-4vcpu` box
(`jobCount: 1`), an explicit cost tradeoff. Adding boxes meant paying for
runners, so a faster pool that recovered wall-clock at zero cost won by default.

**Now:** CI shards the affected projects across 3 free `ubuntu-latest` boxes (OT
plan `b19377d1`; sizing in [ci-cost.md](../monorepo/ci-cost.md) § CI sharding),
and runner minutes are free on this public repo. The cost argument is gone.

The conclusion holds anyway, for a reason that does not depend on price:
**`openthrottle-developer:test` is a single Nx project, and project sharding
cannot split a single project.** Whichever box draws it runs the whole suite, so
that suite's wall-clock is a floor the matrix cannot lower — it is in fact the
floor that caps the useful shard count. On that one box CPU is already saturated
at `maxWorkers: 4`, so the pool config, not the box count, is the only lever
here. A Vitest `--shard` matrix or an Nx atomized `test` target remains the next
lever if this suite's own wall-clock ever becomes the binding constraint.

## Benchmark (full 364-file suite, `--skip-nx-cache`, `CI=true`)

Local 10-core / 64GB box, `maxWorkers: 4`. The CI OOM cannot reproduce locally
(64GB vs the 4-vCPU box), so these numbers measure the _relative_ wall-clock;
the crash-resistance of `vmMemoryLimit` is validated on CI in the PR.

| Pool                                 | Wall-clock | Vitest import (cumulative) | Result           |
| ------------------------------------ | ---------- | -------------------------- | ---------------- |
| `forks` (mitigation)                 | 253s       | 676.8s                     | 1615 pass, 0 err |
| `vmForks` + `vmMemoryLimit: '512MB'` | 79–86s     | ~199–216s                  | 1615 pass, 0 err |

~3× faster, back to the historical vmForks-era ~90s. Four consecutive full runs
under the final config (79s / 80s / 83s / 86s) were green with **0 errors and no
`(0 test)` files**.

## Note (API)

The live Vitest 4 option is **`test.vmMemoryLimit`** (`string | number`), not
`test.memoryLimit`.
