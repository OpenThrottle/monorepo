# 💰 CI cost model

How much CI costs, why, and what it costs to turn something back on.

Before this doc existed, the price of re-enabling a workflow was tribal knowledge scattered across `FIXME: 💰` comments — exactly the knowledge an outside contributor does not have. If you are about to add a job, change a `runs-on`, add a schedule, or flip an `if: false`, read the [checklist](#checklist-before-you-add-a-workflow-or-job) first.

**Measured 2026-08-18, trailing 30 days** (2026-07-19 → 2026-08-18). **Re-verify before quoting a
figure** — run volume moves with development activity, and the whole cost model flips the moment the
repo's visibility changes (see the next section).

---

## ⚠️ The single most important fact: the free tier exists because the repo is PUBLIC

`OpenThrottle/monorepo` is a **public** repository, and GitHub-hosted **standard** runners are free with **unlimited minutes** on public repos. Everything below rests on that.

**If the canonical repo is ever made private, CI starts billing immediately** — every `runs-on: ubuntu-26.04` in `.github/workflows` becomes a metered runner at GitHub's per-minute rate, with no code change and no warning. At the volume measured here (~739 CI runs / 30 days, ~4,200 billed-equivalent minutes) that is a real monthly bill appearing overnight.

Two corollaries:

- **Larger and managed runners are never free**, on any repo visibility. The standard `ubuntu-*` labels (`ubuntu-26.04` today, 4 vCPU / 16 GB) are free; `ubuntu-latest-4-cores`, ARM, GPU, and third-party managed runners are not.
- **Going private is a budget decision, not just an access decision.** Whoever makes that call should re-read this doc first.

> This repo has **two remotes** — `origin` (`OpenThrottle/monorepo`, canonical, public) and a public mirror. The free tier follows the repo Actions runs in, which is `origin`.

---

## Where the money went (measured baseline)

### Only one workflow actually spends

Nine workflows have triggers; **one** consumes runners.

| Workflow                         | Runs (30d) | Runners consumed           |
| -------------------------------- | ---------- | -------------------------- |
| `continuous-integration.yml`     | **739**    | ✅ the only live spender   |
| `vercel-deploy.yml`              | 734        | none — both jobs `skipped` |
| `openthrottle-docker.yml`        | 608        | none — `skipped`           |
| `secret-scan.yml`                | 440        | none — `skipped`           |
| `docs-watch.yml`                 | 45         | none — `skipped`           |
| `daily-merged-prs-summary.yml`   | 30         | none — `skipped`           |
| `terraform-validate.yml`         | 13         | minimal                    |
| `dependency-graph-scheduled.yml` | 5          | none — `skipped`           |
| `nx-release.yml`                 | 0          | none                       |

A high trigger count is **not** a cost. A job whose `if:` evaluates false reports `skipped` and bills nothing. That is why disabling more workflows was explicitly a non-goal of the cost plan — that ground was already worked.

### The runner bill

Sampled the 120 most-recent CI runs and scaled to 739:

| Job                  | Ran       | Raw min   | Billed min (1-min ceiling) |
| -------------------- | --------- | --------- | -------------------------- |
| `build`              | 66 / 120  | 404.2     | 432                        |
| `changes`            | 120 / 120 | 15.8      | **121**                    |
| `ci-success`         | 119 / 120 | 7.6       | **119**                    |
| **Total (120 runs)** |           | **427.6** | **683**                    |

- Per run: **3.56 raw min → 5.69 billed min**. Scaled: **~2,633 raw / ~4,206 billed minutes per month.**
- `build` averages **6.03 min** when it runs (56% of runs — the draft/docs gate correctly skips the rest).
- **Per-minute billing rounds up, and that dominated the waste:** `changes` (avg 8s) and `ci-success` (avg 3.4s) did ~23 min of real work per 120 runs but billed **240** — roughly **35% of the entire bill for two jobs that run a `git diff` and an `echo`**.

### The GCS Nx cache (retired)

The plan assumed egress was an unmeasured cost driver. It was not:

| Metric                     | 30d         | Cost               |
| -------------------------- | ----------- | ------------------ |
| `ReadObject` (Class B ops) | 1,410,159   | ~$5.64             |
| `WriteObject` (Class A)    | 20,162      | ~$0.10             |
| **Egress**                 | **2.47 GB** | **~$0.30**         |
| Storage                    | 2.19 GB     | ~$0.06             |
| **Total**                  |             | **~$6.10 / month** |

Operations, not egress, were the bulk — and the whole line item was ~$6. It was retired for **simplification**, not savings (see [NX.md](./NX.md)).

### Verdict

| Line item            | 30d cost                        | Share       |
| -------------------- | ------------------------------- | ----------- |
| Runner minutes       | ~4,206 billed min               | **~85–92%** |
| GCS Nx cache         | ~$6.10                          | ~8–15%      |
| Nx Powerpack licence | $0 / unknown (likely OSS grant) | —           |

**Runner minutes dominated by 6–11×**, so moving compute to the free tier captured essentially the entire bill.

---

## What each lever did

| Lever                                                               | Effect                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`ubuntu-latest` everywhere** (was `blacksmith-4vcpu-ubuntu-2204`) | **~4,206 billed min/month → $0.** Same 4 vCPU, double the RAM (16 GB vs 8 GB).                                                                                                                                                                           |
| **Retired the GCS Nx remote cache**                                 | ~$6.10/month, and removed the last two **Commercial-licensed** dependencies (`@nx/gcs-cache`, `@nx/key`), `NX_KEY` repo-wide, and GCP credentials from CI.                                                                                               |
| **Fixed the `actions/cache` key**                                   | The Nx cache key had no variable component, and `actions/cache` skips its save on an exact key hit — so it was written once and never refreshed. The free layer was largely inert.                                                                       |
| **Batched agentic pushes**                                          | `AGENTS.md` had instructed "commit **and push** after each task", so an N-task plan produced N CI runs of an unreviewed branch. Now: commit per task, push once per plan, PR stays draft until done.                                                     |
| **Path-gated the full-tree checks**                                 | Licence + notices scans gate on dependency-file changes; the circular-dep walk gates on project-graph files; `format:check` is scoped to changed files on PRs (full sweep still runs on `main`).                                                         |
| **Fixed an unsound Nx cache key**                                   | `format:check` and `check-agent-assets-ssot` declared no `inputs`; the root `monorepo` project owns **0 files**, so their cache keys were constant — `format:check` reported green on unformatted code. Now hashed against real `{workspaceRoot}` globs. |
| **Moved the warn-only coverage audit to a weekly schedule**         | It was `continue-on-error` and excluded from `audit:strict`, so on the PR path it gated nothing.                                                                                                                                                         |
| **Partial-clone checkouts** (`filter: blob:none`)                   | 43 MB → 10 MB of git data per job (77% less); the `changes` job went 92 MB → 6.9 MB.                                                                                                                                                                     |

---

## What it costs to re-enable a disabled workflow

All estimates assume the standard `ubuntu-26.04` runner (free minutes on this public repo), so **"cost" here means wall-clock, queue contention, and any non-Actions spend** — GCS storage/egress, Artifact Registry, Vercel build minutes. If the repo ever goes private, multiply the job-minutes by GitHub's per-minute rate.

| Workflow                              | Currently                                                                        | Cost to re-enable                                                                                                                                                                                                                                                                                           | Non-Actions spend                                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **`secret-scan.yml`**                 | `if: false # TEMPORARY`, no tracking issue                                       | **Low** — one gitleaks scan. PRs scan only the PR range; pushes scan full history. Needs a **full clone with blobs** (see the DO-NOT-FILTER note in the file).                                                                                                                                              | none                                                                                                                                    |
| **`openthrottle-docker.yml`**         | `if: false`                                                                      | **Highest of the set.** Builds **3** images (`openthrottle/migrations`, `openthrottle/mcp`, `openthrottle-server`), 30-min ceiling, and **no remote build cache is wired** — local BuildKit only, so every run starts cold. Now that the Nx remote cache is gone, image builds are cold on the Nx side too. | **Artifact Registry** storage + egress per pushed tag (`sha-<GITHUB_SHA>`, so tags accumulate — set a retention policy before enabling) |
| **`vercel-deploy.yml`**               | both jobs `if: false` (deploys run through Vercel's own Git integration instead) | **Moderate** — a per-app matrix; each entry runs `vercel pull` → `vercel build` → `vercel deploy --prebuilt`. Currently scoped to `openthrottle-website`; adding `openthrottle-developer` roughly doubles it.                                                                                               | **Vercel** build minutes + bandwidth. Enabling this without disabling the dashboard Git integration means **paying twice**.             |
| **`dependency-graph-scheduled.yml`**  | `if: false`, weekly cron                                                         | **Low** — one graph generation, 15-min ceiling, commits a snapshot to `docs/nx/dependency-graphs/`. Each snapshot grows the repo, which raises every clone's cost.                                                                                                                                          | none                                                                                                                                    |
| **`daily-merged-prs-summary.yml`**    | `if: false`, daily cron                                                          | **Negligible** — a GitHub API query writing a job summary.                                                                                                                                                                                                                                                  | none                                                                                                                                    |
| **`docs-watch.yml`**                  | dispatch-gated                                                                   | **Negligible** — one `git diff-tree` (now at `fetch-depth: 2`).                                                                                                                                                                                                                                             | none                                                                                                                                    |
| **`nx-release.yml`**                  | dispatch-only                                                                    | **Low–moderate** — depends on how many packages become `publish: true`. Nothing is published today.                                                                                                                                                                                                         | GitHub Packages storage                                                                                                                 |
| **`nx-dependency-graph`** (job in CI) | `workflow_dispatch`-only                                                         | **Low** — 10-min ceiling, uploads an artifact (30-day retention).                                                                                                                                                                                                                                           | none                                                                                                                                    |

### Recommended re-enable order

1. **`secret-scan.yml` — do this first.** It is cheap, it is a **security** gate rather than a cost/quality tradeoff, and on a **public** repo a leaked credential is immediately world-readable. It is currently disabled behind a bare `if: false # TEMPORARY` with no tracking issue and no expiry, which is the weakest justification of any disabled workflow here. The one-time full-history scan that confirmed the tree clean does not keep it clean.
2. **`daily-merged-prs-summary.yml` / `docs-watch.yml`** — negligible cost, if anyone actually wants the output. Do not enable a schedule nobody reads.
3. **`dependency-graph-scheduled.yml`** — cheap, but weigh the committed-snapshot repo growth against how often the graph is consulted.
4. **`openthrottle-docker.yml`** — only alongside a build-cache strategy and an Artifact Registry retention policy; otherwise it is the most expensive thing here and it accumulates storage forever.
5. **`vercel-deploy.yml`** — only as a _replacement_ for the dashboard Git integration, never in addition to it.

---

## CI sharding: 3 boxes, decided on measurement

`build` is a 3-leg matrix (`env.jobCount: 3`, `matrix.jobIndex: [1, 2, 3]`, `fail-fast: false`).
`scripts/parallelize-tasks.ts` deals the affected projects round-robin — applications first, so
the heavy Vitest suites spread out — and prints each box's Nx `--exclude` selector. Live since OT
plan `b19377d1`.

**Runner minutes are free on this public repo, so shard count is a wall-clock and queue-contention
decision, never a spend decision.** That is the only reason this is on at all: it was deferred for
years as a cost tradeoff, and moving to `ubuntu-latest` (plan `6ced8d0e`) removed the cost.

Baseline measured on four post-migration `build` runs before the matrix was touched:

| segment                                       | typical    | worst observed                                   |
| --------------------------------------------- | ---------- | ------------------------------------------------ |
| checkout + `Node Setup` + symlinks + set-shas | ~56s       | ~56s                                             |
| codegen (+ drift guard)                       | ~27s       | ~31s                                             |
| affected `lint`/`typecheck`                   | ~4m14s     | —                                                |
| affected `test`                               | ~10m51s    | —                                                |
| affected step, combined                       | ~15m08s    | **27m01s** (main, fat graph)                     |
| once-per-run gates                            | ~92s       | ~110s                                            |
| **job total**                                 | **17m07s** | **28m24s** — and one run was cancelled at 28m55s |

Per-box fixed overhead is therefore ~1.6 min — 6% of a typical job, 9% of the worst case — against
88–95% shardable work. The 30-minute job ceiling was already the live risk, not a future one.

⚠️ **The `once-per-run gates` row above was `~20s / ~21s` until 2026-09-16 and was wrong by 4.6x.**
Re-measured across three fat-graph runs, shard 1's job tail ran **82–110s** against ~12s on shards 2
and 3. That figure was load-bearing — it is what the "keep them on shard 1" argument below rested
on — and it is why those gates now run in their own job. See "Whole-tree gates run beside the
matrix" below.

Why **3** and not 2, and not a target-split:

- Projected worst case: 2 boxes → ~15 min; 3 boxes → ~10.6 min. Typical at 3 → ~7.6 min.
- A 4th box would start paying ~1.6 min of setup for shards below the ~5.6 min floor set by the
  single heaviest project — whose Vitest suite is one Nx project and cannot be split by **project**
  sharding at all (the lever there was the `vmForks` pool config). That floor has since moved (see
  "Suite sharding" below), so it was **re-measured on 2026-09-16 (OT plan 0494d906) rather than
  re-derived** — see "The 4th box, re-measured" below. Conclusion unchanged; reasoning replaced.
- A target-split (`target: [lint, typecheck, test]`) is the right answer only when shards are
  **setup-bound**; at 6–9% overhead they are not, and it would leave the ~11-minute `test` graph —
  the segment that is actually growing — whole on one box.
- A `target` × `jobIndex` cross product would be 9 boxes for no extra coverage. Don't.

### The 4th box, re-measured (2026-09-16)

Measured across three fat-graph runs at the live settings ([35049973988](https://github.com/OpenThrottle/monorepo/actions/runs/35049973988),
[35050723575](https://github.com/OpenThrottle/monorepo/actions/runs/35050723575),
[35051408212](https://github.com/OpenThrottle/monorepo/actions/runs/35051408212)), segmenting every
one of the nine shard-jobs into setup / NX work / tail:

| segment                               | measured                                             | previously recorded here                     |
| ------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| per-box setup                         | **86s**                                              | ~1.6 min — still accurate                    |
| once-per-run gates (shard 1's tail)   | **92s**                                              | ~20s — was 4.6x low, **now corrected above** |
| other shards' tail                    | 12s                                                  | —                                            |
| total shardable work                  | **1413s**                                            | —                                            |
| observed max shard vs perfect balance | 548s vs 471s (**imbalance 1.16x mean, 1.34x worst**) | not modelled                                 |
| critical-box job                      | **712s observed = 11.9 min**                         | 17m07s typical, 28m24s worst                 |

Projecting with `setup + (shardable / N) x imbalance + gates` (which predicts 727s against 712s
observed, so it is sound enough to project with):

| jobCount     | critical job     | vs 3  | fixed-overhead share |
| ------------ | ---------------- | ----- | -------------------- |
| 2            | 1001s (16.7m)    | +274s | 17.8%                |
| **3 (live)** | **727s (12.1m)** | —     | **24.5%**            |
| 4            | 590s (9.8m)      | -137s | 30.2%                |
| 5            | 507s (8.5m)      | -219s | 35.2%                |

**Still 3**, but none of the original reasons is why:

- **The 6-9% fixed-overhead figure is dead; it is 24.5% today.** That is the number that actually
  moved, and it moves _against_ more boxes. The rule stated above is that a further split is right
  only when shards are **setup-bound**; at 24.5% — 30.2% at four boxes — they are becoming exactly
  that. Suite sharding lowered the per-project floor as predicted, but it did so by shrinking the
  shardable segment, which raised overhead's share of what remains.
- **The risk that justified sharding is gone.** Sharding was adopted because one box hit 28m24s
  against the 30-minute ceiling. Worst job now observed: **869s = 14.5 min**, under half of it.
  There is no longer a deadline being defended, only a wall-clock preference.
- **Imbalance and the gate tail are cheaper levers than a 4th box.** ~~The round-robin partition ran
  667s / 335s / 495s in run 35051408212; perfect balance caps that run at 499s, saving 168s.~~
  **Both halves of this have since been acted on, and the 168s figure did not survive contact with
  the data** — see "Shard partitioning is weighted by measured cost" and "Runner variance dominates
  the residual spread" below. Weighted packing is worth 15–30% on ordinary PRs but only ~5% on a fat
  graph, and most of that 667/335/495 spread turned out to be runner variance, not the partitioner.
  The 92s gate tail was real and is gone.
- **Runner minutes are free only while this repo is public.** A 4th box is +33% billed minutes the
  day that changes.

Both of those were done (2026-09-16, OT plan 3feb3613) and neither required a 4th box. **jobCount
stays 3.**

Two things sharding required, both easy to get wrong:

- **Once-per-run gates run in their own `gates` job.** Whole-tree checks (circular deps, codegen
  drift guard, agent-asset SSOT/frontmatter, licenses, notices, prettier, `audit:strict`) return the
  same answer on every box, so running them three times triples work for zero coverage. They used to
  sit behind `if: matrix.jobIndex == 1` on shard 1; see "Whole-tree gates run beside the matrix"
  below for why that moved and what it measured. Codegen itself stays on every box: it is a
  prerequisite for typecheck, not a gate.
- **The Nx cache key needs a per-shard discriminator.** `actions/cache` drops all but the first
  save of an identical key, so three legs of one commit would discard two shards' task hashes
  entirely. `node-setup` takes an optional `cache-suffix` (see its header).

### Whole-tree gates run beside the matrix (2026-09-16)

The once-per-run gates moved off shard 1 into a sibling `gates` job. Two measurements drove it
(OT plans 0494d906 and 3feb3613):

- **They cost ~92s, not ~20s.** Shard 1's job tail ran 82–110s across three fat-graph runs, against
  ~12s on shards 2 and 3. Shard 1 was consequently the critical path in every one of those runs.
- **The "a sibling job would pay ~1.6 min of checkout+install" objection does not apply**, because
  that setup is not on the critical path. `gates` runs CONCURRENTLY with the matrix and finishes in
  **168–172s** against the matrix's ~600–700s, so it contributes nothing to wall-clock.

⚠️ **This is not the 4th shard that was measured and rejected.** A 4th shard adds a box whose setup
lands ON the critical path, and per-box fixed overhead is already ~24.5% of the critical job — more
boxes make that worse. A sibling job finishing in a quarter of the matrix's runtime adds nothing to
the critical path at all. Same-sounding change, opposite arithmetic.

Measured before/after, three fat-graph runs each:

|        | shard-1 tail | critical job (mean) | critical job (median) |
| ------ | ------------ | ------------------- | --------------------- |
| before | 82–110s      | 712s                | 656s                  |
| after  | 9–17s        | **635s**            | **611s**              |

The tail collapse is certain. The end-to-end figure carries wide error bars — see "Runner variance"
below.

⚠️ **`ci-success` must keep `gates` in its `needs`.** Branch protection requires `ci-success` and
nothing else, so a gate that fails is only a real gate because that job aggregates this one. Drop it
and every whole-tree check silently becomes advisory while CI reports green.

⚠️ **Adding a step to CI? Decide which side it belongs on.** A per-chunk check belongs in `build`,
where it sees only that shard's projects. A whole-tree check belongs in `gates`. Putting a per-chunk
check in `gates` silently narrows it to nothing; putting a whole-tree check in `build` triples it.

One thing this move flushed out: `validate-agent-assets-frontmatter` and `ingest-agent-assets` both
declared `dependsOn` on `@openthrottle/openthrottle-skills:build`, **a target that does not exist**
(that package is source-first and carries the `__build` placeholder), so Nx silently ignored it.
They passed only by free-riding on the affected `lint`/`typecheck` run, whose `^build` chain built
`@openthrottle/nodejs-utils` first. A job that runs no lint/typecheck removed the free ride and
exposed it. If you move a gate into a job that builds nothing, purge every `dist/` and
`*.tsbuildinfo` and run it from clean before trusting it.

### Shard partitioning is weighted by measured cost

`scripts/parallelize-tasks.ts` packs projects longest-processing-time-first using
`scripts/shard-weights.json`, rather than dealing them round-robin by count. Round-robin was blind
to a project being 100x another, and this workspace spans **1.2s to 117.5s** per project.

**The weights table is committed, and that is deliberate.** Two more obvious sources both break the
one invariant the partitioner has — that every shard computes the IDENTICAL partition from the same
affected list, or a project lands on two boxes or none:

- Nx's own task history (`task_history` in `.nx/workspace-data/*-v3.db`) is **empty** in this
  workspace; Nx 23.2.0 does not populate it here. Verified immediately after a real
  `nx run <p>:lint --skip-nx-cache`.
- The Nx cache is keyed per shard (`cache-suffix: shard-<jobIndex>`, see `node-setup`), so each
  shard restores a **different** cache. Weights derived from local cache state would differ per box.

Regenerate with `pnpm exec tsx ./scripts/generate-shard-weights.ts` (~20 min, sequential by design).
It is **expected to drift and safe to let drift**: weights affect BALANCE only. Correctness comes
from `verifyShardSelection()`'s Nx round-trip, which never reads them, and a missing or corrupt
table falls back to the old round-robin deal. Do not wire this into CI.

Simulated over the measured weights, the packing beats round-robin in 96–100% of trials:

| affected projects | round-robin critical | LPT critical | saved |
| ----------------- | -------------------- | ------------ | ----- |
| 10                | 81.6s                | 57.4s        | 29.7% |
| 20                | 158.1s               | 114.5s       | 27.6% |
| 50                | 321.7s               | 271.1s       | 15.7% |
| 72 (fat graph)    | 415.0s               | 395.1s       | 4.8%  |

Note the shape: **the gain is largest on partial affected sets — ordinary PRs — and smallest on a
fat graph**, where round-robin already averages out across 72 projects. Anyone quoting a
fat-graph number as the benefit has it backwards.

### Runner variance dominates the residual spread

⚠️ Before attributing a slow shard to the partitioner, rule this out. Across three runs with an
**identical** affected set and an identical partition (the partitioner logs `[~395s]` per shard on
every run), the same chunk took:

- shard 2: **603s → 383s → 360s** — a 1.7x swing on identical work
- shard 3: **512s → 517s → 333s**

while shard 1, holding the 117.5s `openthrottle-server`, was steady at 494/483/489s.

Identical work, identical partition, 1.7x swing: that is the GitHub runner, and no partitioning
algorithm can fix it. An earlier analysis read one run's 667/335/495 spread as partition imbalance
and projected ~168s of recoverable time from it; that was over-attribution, and it is why the
numbers in this section come from repeated runs rather than one.

### Suite sharding: splitting one project across all three boxes

The bullet above priced the 4th box against a ~5.6 min floor set by the heaviest single project.
That framing was right about **project** sharding — dealing whole projects to boxes, which is all
`parallelize-tasks.ts` used to do — and wrong to treat it as the only kind. Vitest's own `--shard`
splits a suite **within** a project, and `openthrottle-developer`'s suite was 88% of the heaviest
box's wall-clock, so that is where the remaining money was. Live since OT plan `9fc16731`.

Measured through Nx with `--skip-nx-cache`, `CI=true`:

| target on the heaviest box           | before             | after                 | change   |
| ------------------------------------ | ------------------ | --------------------- | -------- |
| `openthrottle-developer` `lint`      | 9.6s               | 9.6s                  | —        |
| `openthrottle-developer` `typecheck` | 10.6s              | 10.6s                 | —        |
| `openthrottle-developer` `test`      | 136.9s (679 files) | **45.9s** (227 files) | **−66%** |

The other two boxes take 226 files each (43.8s / 43.6s); 227 + 226 + 226 = 679, which is the check
that matters — a silently-ignored `--shard` would run the whole suite on all three boxes and still
report green. Shard 1's files-collected count is the number to read in the log, never the colour.

The table above is the measurement as taken; **the suite has since grown to 761 files** and the sum
check still holds — re-verified 2026-09-16 across 8 runs as **254 + 254 + 253 = 761**, against 761
matches for `find applications/openthrottle-developer -name '*.test.ts*'`. Re-run that `find` when
you re-check the total; the constant in this table will keep drifting, the _equality_ is the rule.

How it is wired, and the two traps:

- The partitioner emits **two** selectors. `selector` still deals every affected project to exactly
  one box and drives `lint`/`typecheck`; `testSelector` is the same chunk with suite-sharded
  projects removed. So the heavy app is still linted and typechecked by exactly one box, and its
  `test` is run by all three under a different `--shard`. Both selectors round-trip through Nx
  before anything runs.
- **`--shard` must stay on its own `nx run-many` invocation.** Attaching it to the general
  `nx affected --target=test` line would shard every other project's suite too — running a third of
  each and reporting green, which is the silent-pass failure this whole partition exists to prevent.
- **The Nx cache does distinguish the shards** (verified: a different shard is a miss, the same
  shard is a hit). CLI overrides participate in the task hash. An env-driven shard read inside
  `vitest.config.ts` would NOT be in the hash, and boxes 2 and 3 would replay box 1's result — two
  thirds of the suite never running, green. Do not implement it that way.

Coverage is opt-in and off in CI, so the shards' shared `reportsDirectory` never collides today. If
coverage is ever enabled, each shard needs its own directory plus a merge step first.

The pool tuning (`vmForks` + `vmMemoryLimit: '512MB'` + `maxWorkers: 4` on CI) is
orthogonal to this and still load-bearing against the silent `(0 test)` OOM. Sharding lowers how
many files a box carries; it does nothing about accumulation within the files it does carry. See
[developer-vitest-pool.md](../reliability/developer-vitest-pool.md).

`ci-success` remains the single required check. It aggregates the matrix — green only when every
shard succeeded or the build legitimately skipped — so branch protection must **never** pin a
matrix-suffixed leg name like `build (1, lint,typecheck,test)`; those names change with the shard
count.

---

## Merge queue on `main`

`main` lands every PR through GitHub's merge queue, configured as the `merge_queue` rule on ruleset
`main` (`14604876`). The source of truth for the whole ruleset is
[rulesets/main-ruleset-with-merge-queue.json](./rulesets/main-ruleset-with-merge-queue.json), a
payload that can be `PUT` as-is. Classic branch protection still owns the one required context
(`ci-success`). That split is deliberate: the queue and the required-check surface change
independently, so a stall has one candidate cause at a time.

Classic protection's `strict` (require branches to be up to date) is **off** since 2026-11-04. The
queue made it redundant: OT plan e702d884's task 5 saw a PR two commits behind `main` report
`mergeStateStatus=CLEAN` and enter the queue directly, which is correct, because the queue re-tests
every entry on top of the current `main` anyway. With `strict` on, that PR would first have needed a
rebase and a full CI run that the queue was about to repeat. `ci-success` is still the only required
context.

**Why it is on.** Plan runs open PRs in parallel. A PR that passed CI on its own branch says nothing
about the tree `main` will have after another PR lands first. Two branches that each pass alone can
break `main` together: probe #652 redeclared a `const` that #651 also added, both PR runs went green,
and only the queue's build of the two together failed (TS2451). The old guard against that was
`strict`, which makes every merge invalidate every other ready PR until it rebases and re-runs CI:
O(N²) rebases for N concurrent PRs. The queue instead tests each entry once, against the tree `main`
will actually have after it lands, and lands entries in order without a manual rebase.

| Setting                             | Value      | Why                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `merge_method`                      | `SQUASH`   | Preserves the repo's one-commit-per-PR history while staying compatible with `required_linear_history`. The landed commit keeps the PR title plus the commits' bodies (`squash_merge_commit_message: COMMIT_MESSAGES`), which preserves `Plan-Id:` / `Task-Id:` traceability.                                |
| `grouping_strategy`                 | `ALLGREEN` | Every entry in a group must go green before anything lands. A failing entry is ejected and the entries behind it rebuild without it. HEADGREEN would land a group on its head's result alone, trusting that the earlier entries' own runs would have caught their breakage. That is not worth the risk here. |
| `max_entries_to_build`              | `3`        | Sized to the org's **GitHub Free** plan, which allows 20 concurrent Linux jobs. One entry runs about 5 jobs at once (3 `build` shards, `gates`, `attribution-guard`), so 3 entries take ~15 and leave room for ready-PR runs and `push: main`. 5 would ask for ~25 and queue its own jobs behind each other. |
| `min_entries_to_merge`              | `1`        | A ready PR never waits for company before the queue starts validating it.                                                                                                                                                                                                                                    |
| `max_entries_to_merge`              | `3`        | Lets a busy queue land a whole built group in one fast-forward, capped at the build depth.                                                                                                                                                                                                                   |
| `min_entries_to_merge_wait_minutes` | `0`        | The wait only applies while a group is below `min_entries_to_merge`. That minimum is 1, so any wait would never fire. 0 says so instead of implying a batching window that does not exist.                                                                                                                   |
| `check_response_timeout_minutes`    | `45`       | The per-shard `build` ceiling is `30` minutes, so the queue timeout must exceed the workflow's own worst case with real headroom rather than dequeue healthy runs. Typical runs take 3–9 minutes.                                                                                                            |

What a queue entry runs, in `continuous-integration.yml` on the `merge_group` event:

- **`changes`** diffs `merge_group.base_sha..head_sha`: the `main` tip the queue built on, against
  that tip plus every squash ahead of this entry plus this one. The licence scans and the
  circular-dependency check only run when the group touched their inputs, and a docs-only group
  skips `build`. Any diff error fails closed.
- **`build` / `gates`** are affected-scoped by `nrwl/nx-set-shas`. Its default
  `use-previous-merge-group-commit: true` sets `NX_BASE` to `HEAD^1`, the previous commit in the
  group, so an entry builds only its own change, on a tree that already holds the entries ahead of it.
  Under ALLGREEN those entries are covered by their own runs. Prettier and migration hygiene sweep
  the whole tree.
- **A red `build` shard or a red `gates` cancels the whole run** (merge_group only). The queue
  ejects an entry only once `ci-success` reports, and that job waits for every shard and `gates`.
  Probe run 41931301776 failed a shard at 23:09:50 and ejected at 23:12:02, all of it spent waiting
  for `gates`, and every entry behind it waited too. So the last step of each of those jobs runs
  `gh run cancel` when the job has failed (job-scoped `actions: write`), and the matrix fails fast
  on this event as a backstop. `ci-success` still runs, because `if: always()` survives a cancel,
  and still reports red: the cancelling job is `failure` or `cancelled`, and `ci-success` accepts
  only `success` or `skipped`. Ready PRs keep `fail-fast: false`, because three complete shard
  results tell an author more than one.
- **`attribution-guard`** checks the squash commits in `base_sha..head_sha`. The queue fast-forwards
  `main` to `head_sha`, so those exact server-composed messages are what land, and no local hook can
  see them. A hit ejects the PR before it becomes immutable history.

CI volume per PR: the ordinary `pull_request` run, one `merge_group` run, and the `push: main` run
when the squash lands. That is 3 runs, against 2 without a queue, and far fewer than the rebase
churn `strict` causes with several ready PRs at once. Runner minutes are free on this public repo
either way, so the cost is wall-clock on the queue entry. The `push: main` run stays on purpose: it
is the only post-merge signal on the real default-branch ref, and the cache-seeding run that
downstream PRs restore from.

Required-check rule: **a status check may be marked required on `main` only if the workflow that
reports it also triggers on `merge_group`.** Otherwise the queue waits for a status that can never
report, and dequeues the PR when the timeout runs out. `ci-success` is safe: it is the stable,
non-matrix job in `continuous-integration.yml`, and that workflow runs on `merge_group`.

Landing a PR: `gh pr merge --auto` **enqueues** it. Leave out `--squash`: the ruleset's
`merge_method` decides, and gh ignores the flag with "The merge strategy for main is set by the
merge queue". Do not call a PR merged, or read a landed SHA, until
`gh pr view --json mergedAt,mergeCommitSha` shows one.

Applying or changing the queue:

1. Edit the payload, then `gh api -X PUT repos/OpenThrottle/monorepo/rulesets/14604876 --input docs/monorepo/rulesets/main-ruleset-with-merge-queue.json`.
2. Re-read the ruleset and classic branch protection to confirm the `merge_queue` values, that
   `ci-success` is still the only required status check, and that `strict` is still off.

Turning it off takes **two** changes, and the second is not optional:

1. `PUT` the same payload without the `merge_queue` rule, touching nothing else.
2. Turn `strict` back on:
   `gh api -X PATCH repos/OpenThrottle/monorepo/branches/main/protection/required_status_checks -F strict=true`.

With neither the queue nor `strict`, nothing stops two PRs that each pass alone from breaking `main`
together, which is exactly what probe #652 did. Keep the workflow's `merge_group` trigger either
way.

---

## Runner label: pinned to `ubuntu-26.04`

Every job runs on the explicit `ubuntu-26.04` label, not `ubuntu-latest`. It is the same free
standard runner (4 vCPU / 16 GB); the difference is who decides when the OS changes. `ubuntu-latest`
is a moving alias: GitHub re-points it to a new Ubuntu over a weeks-long rollout, and during that
window any job can land on either image from one run to the next with nothing in our history to
show it. A pinned label only changes when a commit here changes it, so an OS upgrade is a reviewed
PR with a canary behind it, not something that happens to us.

The cost is a manual bump when GitHub retires a label. GitHub announces those months ahead, and the
[checklist](#checklist-before-you-add-a-workflow-or-job) below covers what to do.

### How we got to 26.04 (OT plan `4353746e`)

GitHub moved `ubuntu-latest` from 24.04 to **26.04** between 2026-10-19 and 2026-11-19
([actions/runner-images#14748](https://github.com/actions/runner-images/issues/14748)). Before
pinning, every workflow ran on `ubuntu-26.04` from a throwaway draft PR
([canary PR #602](https://github.com/OpenThrottle/monorepo/pull/602), closed unmerged), and each
shell step was audited against the real image:

- **What changed on the image.** `sha256sum`, `install`, `date`, `tr` and `seq` are **uutils
  coreutils** (Rust), and `sudo` is **sudo-rs**. `sed`, `xargs` and `tar` are still GNU. The image
  also moves Docker 28 → 29, Compose 2.38 → 5.1, jq 1.7 → 1.8.1, shellcheck 0.9 → 0.11, Bash 5.2 → 5.3
  and openssh-client 9.6 → 10.2.
- **What we had to change: nothing in the workflows' steps.** Every workflow enabled on `main`
  passed on 26.04: CI `build`/`gates`, all four Docker image builds and Terraform validate. Every
  idiom we rely on behaved the same on both images, including `sha256sum -c -`,
  `sudo install -m 0755`, `date -d 'yesterday'`, `sed -n s///p` and `xargs -0`. The only change is
  the label itself.
- **The Hetzner deploy key is fine.** OpenSSH 10 drops DSA keys, so `hetzner-deploy` would have
  broken on 26.04 if `HETZNER_SSH_PRIVATE_KEY` were an `ssh-dss` key. The owner confirmed on
  2026-10-31 that it isn't.

---

## Checklist: before you add a workflow or job

- [ ] **`runs-on: ubuntu-26.04`**, the pinned standard label, unless you can state, in a comment, why a larger or managed runner is worth real money. Never add a Blacksmith or larger-runner label without pricing it here first.
- [ ] **Path-gate it.** If the result can only change when certain files change, gate on those files. Compute the gate in the existing `changes` job — it already has the diff and costs no extra runner.
- [ ] **Fail closed.** A gate that skips must never make a broken state look green. Default to _running_ the check when the diff cannot be computed, and for all non-PR events. Remember a **skipped** job reports **green** to branch protection.
- [ ] **Skip draft PRs.** `build` already does; match it.
- [ ] **Prefer `nx affected` over full-tree.** If a check must be full-tree, say why in a comment.
- [ ] **Declare Nx `inputs` explicitly for any `monorepo`-project target.** The root project's `projectRoot` is `.` but it owns **0 files**, so the default `{projectRoot}` input hashes nothing and the target will cache-hit forever — silently passing. Use `{workspaceRoot}` globs. This has already bitten `format:check` once.
- [ ] **Minimise the checkout.** `fetch-depth: 1` if you need no history; `fetch-depth: 0` + `filter: 'blob:none'` if you need history but not old file contents. Full clones need a written justification (only `secret-scan` has one).
- [ ] **Never add a schedule without an estimate.** State the cadence, the per-run cost, and who reads the output. A cron nobody reads is pure spend forever.
- [ ] **Don't add a required check that can fail to report.** A workflow-level `paths-ignore` on a required check hangs the PR as _"Expected — waiting for status"_ forever. This is why `ci-success` exists as a separate always-reporting gate — read the header of `continuous-integration.yml` before restructuring it.
- [ ] **A required check must trigger on `merge_group`.** `main` lands through the merge queue (see § Merge queue on `main`), and a PR-only workflow can never report inside it, so GitHub waits until `check_response_timeout_minutes` expires and then dequeues every PR.
- [ ] **If you disable something, leave a reason and an owner.** `if: false` with no explanation becomes permanent. Link back to this doc.
- [ ] **Bump the runner label deliberately, with a canary.** When GitHub announces a new Ubuntu runner (or the deprecation of `ubuntu-26.04`), run every workflow on the new label from a throwaway draft PR and dispatch the read-only scheduled workflows against it. Fix anything that breaks, then change every `runs-on` in one PR. Never switch to `ubuntu-latest`: it would bring back unannounced OS changes. OT plan `4353746e` is the worked example; see § Runner label: pinned to `ubuntu-26.04`.

---

## Open items

- **Blacksmith's per-minute rate** was never confirmed against an invoice; the ~$34–67/month range brackets two plausible rates. Now moot unless paid runners return.
- **`NX_KEY` is an unreferenced repo variable** and should be deleted from repo settings. It was also stored as a **variable rather than a secret** — Actions variables are not masked in logs. A licence key belongs in `secrets`.
- ~~**Once the `ubuntu-26.04` pin merges, confirm the next `main` run logs `Image: ubuntu-26.04`** in
  every job, then close OT plan `4353746e`.~~ **Settled 2026-10-31** — the pin landed in
  `8f0e1b4f` (#604), and every job of that commit's `main` runs logged `Image: ubuntu-26.04`:
  Continuous Integration (7 jobs; `attribution-guard` is skipped on push), OpenThrottle Docker (5), Terraform Validate (1) and Hetzner
  Deploy (1). OT plan `4353746e` is closed.
- **`gs://openthrottle-staging-nx-cache`** is kept for a soak period after the cache retirement; delete it around **2026-09-01** so the 90-day lifecycle stops paying storage on dead entries.
- **Nx Powerpack licence type** (paid vs Nx's free-for-OSS grant) is unconfirmed — needs the Nx account. Moot now that `@nx/gcs-cache` is removed.
- ~~**`nx affected --target=test` still runs at Nx's default concurrency.**~~ **Settled
  2026-09-16 (OT plan 0494d906)** — see "Nx `--parallel` semantics" below. Measured at
  `--parallel=4` over 5 CI runs against a 3-run control: it does **not** OOM (peak ~7.7 GB of
  16 GB, zero `(0 test)` files, zero killed workers), and it delivers **no measurable
  throughput gain**. It stays at the default 3 because widening it was measured to do nothing,
  not because of the OOM. Full method and run URLs in the comment above that step in
  `continuous-integration.yml`.

## Nx `--parallel` semantics

Recorded here because misreading this flag produced three separate false claims in this repo, in
this file and in `continuous-integration.yml`. Verified against the installed Nx **23.2.0**
(`getThreadPoolSize`, `node_modules/nx/dist/src/tasks-runner/task-orchestrator.js`):

| flag form                           | effective concurrency           |
| ----------------------------------- | ------------------------------- |
| _no `--parallel` flag_              | **3**                           |
| `--parallel` (bare)                 | **3**                           |
| `--parallel=true`                   | **3**                           |
| `--parallel=1` / `--parallel=false` | 1                               |
| `--parallel=N`                      | N                               |
| `--parallel=50%`                    | 50% of `availableParallelism()` |

**A bare `--parallel` does not mean "use all cores".** It means 3, identical to omitting the flag.
`availableParallelism()` is consulted _only_ for a percentage value. `nx.json` sets no
workspace-level `parallel`, so nothing overrides that default.

Consequences that had been recorded backwards:

- CI's `lint,typecheck,bundle-hooks-check --parallel` and its flagless `--target=test` run at the
  **same** concurrency. The workflow comment claiming lint/typecheck ran "at full parallelism" while
  `test` was throttled was never true.
- `check:local:affected-lint` / `-typecheck` / `-test` all pass a bare `--parallel`, so the local
  lane runs at **3** as well. There is no local-vs-CI concurrency asymmetry, contrary to prose that
  claimed one.
- Only an **explicit number** changes anything. `build:all --parallel=4` is a real setting;
  `--parallel` on its own is decoration.

Unrelated: `"parallel": false` on `check-agent-assets-ssot` in `nx.json` is an `nx:run-commands`
option that serializes that target's two shell commands. It is not task concurrency and has nothing
to do with any of the above.

## Vitest time budget

Vitest defaults to a 5000ms `testTimeout`, and until 2026-08 **no project in the
workspace overrode it**. Every suite therefore ran with zero headroom. That was
survivable until 3-way sharding raised per-box CPU contention, at which point
three I/O-heavy suites began tipping over intermittently — `tools/generators`'
react generator suites, `react-router-editor`'s `Editor.ssr.test.tsx` (measured
at 6318ms on CI against the 5000ms budget), and `openthrottle-ide`'s
`watch.test.ts`. Sharding did not make them slow; it removed the slack that had
been hiding how close they already were.

The budget is now **15000ms** for both `testTimeout` and `hookTimeout`, set in
`createBaseVitestConfig` (`@tools/dotfiles`, exported as
`VITEST_TEST_TIMEOUT_MS` / `VITEST_HOOK_TIMEOUT_MS`) and mirrored literally in
the handful of configs that do not go through that helper — the four React
Router apps, `openthrottle-server`, three `tools/*` packages, the root
`scripts/` config, and both generator templates so new projects inherit it.

Chosen from measurement rather than taste: ~2x the worst observed overrun, which
still fails a genuine hang in 15s rather than letting it consume the box.
Verified both ways — the three offenders pass, and a deliberately hung test
fails at 15004ms. The per-shard `timeout-minutes` job ceiling stays as the
backstop.

Blanket `retry: 1` was considered and rejected: it turns a real timing
regression into a silent 2x cost and a green check.

## See also

- [NX.md](./NX.md) — caching model, why there is no remote cache backend
- [CI-quality-gates.md](./CI-quality-gates.md) — gate priorities, owners, job mapping
- [test-coverage-audit.md](./test-coverage-audit.md) — the warn-only audit and its flip path
