# openthrottle-developer Vitest pool: `vmForks` + `vmMemoryLimit`

**Applies to:** `applications/openthrottle-developer` — its jsdom Vitest suite (**716 test files**
as of 2026-08-28), the heaviest `test` target in CI. Config:
[`applications/openthrottle-developer/vitest.config.ts`](../../applications/openthrottle-developer/vitest.config.ts),
whose JSDoc carries the same reasoning inline.

## The configuration

```ts
maxWorkers: resolveMaxWorkers(), // CI: 4. Local: clamp(availableParallelism() - 2, 4, 8)
pool: 'vmForks',
vmMemoryLimit: '512MB',
```

Three values, each bounded for a different reason.

### `pool: 'vmForks'` — for the import amortization

`vmForks` runs each test file with an isolated module registry but **reuses the worker process**, so
the module graph is imported once per worker and amortized across every file that worker handles.
That is the wall-clock win over `forks`, which re-imports per file.

**Measured** on this suite at 364 files: `forks` 253s (676.8s cumulative import) vs `vmForks` +
`vmMemoryLimit` 79–86s (~199–216s import) — ~3×, both 1615 pass / 0 errors. Local 10-core / 64GB box,
`maxWorkers: 4`, `--skip-nx-cache`, `CI=true`.

### `vmMemoryLimit: '512MB'` — because an unbounded reused worker OOMs

An **unbounded** reused `vmForks` worker accumulates V8 VM contexts across the whole suite. Under the
4-vCPU CI box's memory ceiling it gets SIGKILLed mid-file, which surfaces as in-flight files
reporting **`(0 test)` with no error stack and no Vitest summary** — a silent container OOM, not a V8
heap error and not a real assertion failure. It is flaky and non-deterministic, so it reads as
unrelated test failures.

`test.vmMemoryLimit` makes Vitest recycle a worker once its heap crosses the limit, capping
accumulation at ~512MB/worker (≈`maxWorkers` × 512MB peak, far under the box) while keeping the
import amortization. 512MB already sits at the vmForks speed floor.

> **If the `(0 test)` crash ever returns, LOWER `vmMemoryLimit` first** — more frequent recycles.
> Only then consider `maxWorkers` or the box size. Do **not** raise `--max-old-space-size`: it fights
> the box limit, not the accumulation. And do not switch back to `pool: 'forks'` — that trades ~3× of
> wall-clock for a problem `vmMemoryLimit` already solves.

### `maxWorkers` — a CI constraint, not a machine one

CI runs the `test` target at Nx's default concurrency on a 4-vCPU box **shared with up to two sibling
suites from the same shard**, so the cap bounds this suite's share of the box rather than the box
itself. Keep the CI value at 4.

A developer laptop has no such constraint and was leaving most of its cores idle, so off CI the cap
scales with the machine — two cores left for the OS, hard-capped at 8, because past that the workers
contend and the suite gets slower again (**measured** on a 10-core M1 Max: 4 → 167s, 8 → 130s, 10 →
136s). `vmMemoryLimit` bounds each worker independently, so scaling up does not reintroduce the OOM.

Vitest 4 removed the per-pool `poolOptions.*.maxForks` knob; top-level `maxWorkers` is the cap.

## Pool tuning and `--shard` are orthogonal

CI runs this suite as three Vitest `--shard`s across the 3-box matrix, lifted out of the per-box
`test` partition by `scripts/parallelize-tasks.ts`. **Measured** through Nx with `--skip-nx-cache`:

| run        | files | wall-clock |
| ---------- | ----- | ---------- |
| full suite | 679   | 136.9s     |
| shard 1/3  | 227   | **45.9s**  |
| shard 2/3  | 226   | 43.8s      |
| shard 3/3  | 226   | 43.6s      |

227 + 226 + 226 = 679: the shards partition the suite exactly, which is the check that matters — a
silently-ignored `--shard` would have run all 679 three times and still been green. Verify that sum
whenever the sharding changes.

**Sharding is not a reason to revisit the pool.** `--shard` lowers how many files a box carries;
`vmForks` + `vmMemoryLimit` bounds V8 VM-context accumulation within whatever it does carry. Two
levers, two different problems.

Note also that **project**-level sharding cannot help here — `openthrottle-developer:test` is a
single Nx project, so whichever box draws it would run all of it. Vitest's own `--shard` splits
_within_ a project, which is why it is the lever that works.

## API note

The live Vitest 4 option is **`test.vmMemoryLimit`** (`string | number`), not `test.memoryLimit`.

Sizing for the CI boxes themselves is in [ci-cost.md](../monorepo/ci-cost.md) § CI sharding.
