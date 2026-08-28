# 💰 CI cost model

How much CI costs, why, and what it costs to turn something back on.

Before this doc existed, the price of re-enabling a workflow was tribal knowledge scattered across `FIXME: 💰` comments — exactly the knowledge an outside contributor does not have. If you are about to add a job, change a `runs-on`, add a schedule, or flip an `if: false`, read the [checklist](#checklist-before-you-add-a-workflow-or-job) first.

**Measured 2026-08-18, trailing 30 days** (2026-07-19 → 2026-08-18). **Re-verify before quoting a
figure** — run volume moves with development activity, and the whole cost model flips the moment the
repo's visibility changes (see the next section).

---

## ⚠️ The single most important fact: the free tier exists because the repo is PUBLIC

`OpenThrottle/monorepo` is a **public** repository, and GitHub-hosted **standard** runners are free with **unlimited minutes** on public repos. Everything below rests on that.

**If the canonical repo is ever made private, CI starts billing immediately** — every `runs-on: ubuntu-latest` in `.github/workflows` becomes a metered runner at GitHub's per-minute rate, with no code change and no warning. At the volume measured here (~739 CI runs / 30 days, ~4,200 billed-equivalent minutes) that is a real monthly bill appearing overnight.

Two corollaries:

- **Larger and managed runners are never free**, on any repo visibility. `ubuntu-latest` (4 vCPU / 16 GB) is free; `ubuntu-latest-4-cores`, ARM, GPU, and third-party managed runners are not.
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
| **Path-gated the full-tree checks**                                 | Licence + notices scans gate on dependency-file changes; the circular-dep walk gates on project-graph files; `format-check` is scoped to changed files on PRs (full sweep still runs on `main`).                                                         |
| **Fixed an unsound Nx cache key**                                   | `format-check` and `check-agent-assets-ssot` declared no `inputs`; the root `monorepo` project owns **0 files**, so their cache keys were constant — `format-check` reported green on unformatted code. Now hashed against real `{workspaceRoot}` globs. |
| **Moved the warn-only coverage audit to a weekly schedule**         | It was `continue-on-error` and excluded from `audit:strict`, so on the PR path it gated nothing.                                                                                                                                                         |
| **Partial-clone checkouts** (`filter: blob:none`)                   | 43 MB → 10 MB of git data per job (77% less); the `changes` job went 92 MB → 6.9 MB.                                                                                                                                                                     |

---

## What it costs to re-enable a disabled workflow

All estimates assume `ubuntu-latest` (free minutes on this public repo), so **"cost" here means wall-clock, queue contention, and any non-Actions spend** — GCS storage/egress, Artifact Registry, Vercel build minutes. If the repo ever goes private, multiply the job-minutes by GitHub's per-minute rate.

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
| once-per-run gates                            | ~20s       | ~21s                                             |
| **job total**                                 | **17m07s** | **28m24s** — and one run was cancelled at 28m55s |

Per-box fixed overhead is therefore ~1.6 min — 6% of a typical job, 9% of the worst case — against
88–95% shardable work. The 30-minute job ceiling was already the live risk, not a future one.

Why **3** and not 2, and not a target-split:

- Projected worst case: 2 boxes → ~15 min; 3 boxes → ~10.6 min. Typical at 3 → ~7.6 min.
- A 4th box would start paying ~1.6 min of setup for shards below the ~5.6 min floor set by the
  single heaviest project — whose Vitest suite is one Nx project and cannot be split by **project**
  sharding at all (the lever there was the `vmForks` pool config). **That floor has since
  moved — see "Suite sharding" below — but the conclusion is unchanged and needs re-measuring, not
  re-deriving, before anyone adds a 4th box.**
- A target-split (`target: [lint, typecheck, test]`) is the right answer only when shards are
  **setup-bound**; at 6–9% overhead they are not, and it would leave the ~11-minute `test` graph —
  the segment that is actually growing — whole on one box.
- A `target` × `jobIndex` cross product would be 9 boxes for no extra coverage. Don't.

Two things sharding required, both easy to get wrong:

- **Once-per-run gates sit behind `if: matrix.jobIndex == 1`.** Whole-tree checks (circular deps,
  codegen drift guard, agent-asset SSOT/frontmatter, licenses, notices, prettier, `audit:strict`)
  return the same answer on every box, so running them three times triples work for zero coverage.
  They live on shard 1 rather than a sibling job because they total ~20s — less than the
  checkout+install a fourth runner would cost to reclaim them. Codegen itself stays on every box:
  it is a prerequisite for typecheck, not a gate.
- **The Nx cache key needs a per-shard discriminator.** `actions/cache` drops all but the first
  save of an identical key, so three legs of one commit would discard two shards' task hashes
  entirely. `node-setup` takes an optional `cache-suffix` (see its header).

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

> **DISABLED 2026-08-28.** With a single contributor there is no PR concurrency, so the queue's
> ALLGREEN speculative grouping protected against semantic conflicts that cannot occur — while
> every enqueued PR still paid a duplicate `merge_group` CI run plus queue wait time. The
> `merge_queue` rule was removed from ruleset `main` (`14604876`); everything else (the rest of
> the ruleset, classic branch protection, the `ci-success` required check, and the workflow's
> `merge_group` trigger) is untouched. Re-enable by restoring the captured pre-change payload:
> [rulesets/main-ruleset-with-merge-queue.json](./rulesets/main-ruleset-with-merge-queue.json).

While it was on, `main` used GitHub's merge queue through ruleset `main` (`14604876`). The queue
was configured on the **ruleset** surface, while classic branch protection still owns the one
required context (`ci-success`). That split is deliberate: the queue flip and the required-check
surface move were kept separate so a stall would have one candidate cause at a time.

Applied queue settings (historical record — these are the values in the captured payload, and what
a re-enable restores):

| Setting                             | Value      | Why                                                                                                                                                                                                                               |
| ----------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `merge_method`                      | `SQUASH`   | Preserves the repo's one-commit-per-PR history while staying compatible with `required_linear_history`; the landed commit keeps the PR title plus the commits' footer body, which preserves `Plan-Id:` / `Task-Id:` traceability. |
| `grouping_strategy`                 | `ALLGREEN` | Every entry in a speculative group must go green before anything lands, which is the conservative "no semantic-conflict hole" choice this queue exists to buy.                                                                    |
| `max_entries_to_build`              | `5`        | Enough speculative depth to keep the queue moving without exploding parallel runner demand.                                                                                                                                       |
| `min_entries_to_merge`              | `1`        | A ready PR never waits for company before the queue can start validating it.                                                                                                                                                      |
| `max_entries_to_merge`              | `5`        | Allows grouped landings when the queue is busy, capped to the same scale as speculative builds.                                                                                                                                   |
| `min_entries_to_merge_wait_minutes` | `5`        | Small batching window: enough to catch a nearby second PR, short enough not to feel stuck.                                                                                                                                        |
| `check_response_timeout_minutes`    | `45`       | The per-shard CI ceiling is `30` minutes, so the queue timeout must exceed the workflow's own worst case with real headroom rather than dequeuing healthy runs.                                                                   |

What this does to CI volume:

- **Queue off (current):** a PR costs its ordinary `pull_request` run, plus the `push: main` run
  when the squash lands — **2 runs total**, with no queue latency. The pre-merge `merge_group` run
  on a synthetic `gh-readonly-queue/main/pr-N-<sha>` ref is gone.
- **Queue on (historical):** enqueuing added that `merge_group` run between the two — roughly a
  **2x increase before merge, and often a 3rd post-merge validation run**.

On this **public** repo the runner minutes are free either way, so what the disable buys back is
wall-clock: no queue wait (`min_entries_to_merge_wait_minutes: 5`, `check_response_timeout_minutes:
45` worst case) and no duplicate pre-merge validation. The `push: main` run stays on purpose: it is
the only post-merge signal on the actual default-branch ref and the cache-seeding run that
downstream PRs restore from. If that changes, reprice the wall-clock and re-document it here rather
than letting the rationale drift.

Required-check rule **if the queue is re-enabled**: **a status check may be marked required on
`main` only if the workflow that reports it also triggers on `merge_group`.** Otherwise the queue
waits for a status that can never report and eventually dequeues the PR on timeout. `ci-success` is
safe because it is the stable, non-matrix job in `continuous-integration.yml`, and that workflow
still runs on `merge_group` — the trigger is deliberately kept (inert while the queue is off)
precisely so re-enabling cannot recreate this failure mode.

Re-enable path:

1. Restore the captured pre-change ruleset payload:
   `gh api -X PUT repos/OpenThrottle/monorepo/rulesets/14604876 --input docs/monorepo/rulesets/main-ruleset-with-merge-queue.json`
   (strip the read-only fields — `id`, `node_id`, `source*`, `created_at`, `updated_at`,
   `current_user_can_bypass`, `_links` — or resend just `name`/`target`/`enforcement`/`conditions`/`bypass_actors`/`rules`).
2. Re-read the ruleset and classic branch protection to confirm the `merge_queue` rule is back and
   `ci-success` is still the only required status check.
3. Before flipping, confirm every required check's workflow triggers on `merge_group` (see the rule
   above) — a PR-only required check dequeues every PR on timeout.

The reverse procedure (disabling again) is what this section's DISABLED note records: remove the
`merge_queue` rule from the ruleset via `gh api -X PUT`, touching nothing else.

---

## Checklist: before you add a workflow or job

- [ ] **`runs-on: ubuntu-latest`** unless you can state, in a comment, why a larger or managed runner is worth real money. Never add a Blacksmith or larger-runner label without pricing it here first.
- [ ] **Path-gate it.** If the result can only change when certain files change, gate on those files. Compute the gate in the existing `changes` job — it already has the diff and costs no extra runner.
- [ ] **Fail closed.** A gate that skips must never make a broken state look green. Default to _running_ the check when the diff cannot be computed, and for all non-PR events. Remember a **skipped** job reports **green** to branch protection.
- [ ] **Skip draft PRs.** `build` already does; match it.
- [ ] **Prefer `nx affected` over full-tree.** If a check must be full-tree, say why in a comment.
- [ ] **Declare Nx `inputs` explicitly for any `monorepo`-project target.** The root project's `projectRoot` is `.` but it owns **0 files**, so the default `{projectRoot}` input hashes nothing and the target will cache-hit forever — silently passing. Use `{workspaceRoot}` globs. This has already bitten `format-check` once.
- [ ] **Minimise the checkout.** `fetch-depth: 1` if you need no history; `fetch-depth: 0` + `filter: 'blob:none'` if you need history but not old file contents. Full clones need a written justification (only `secret-scan` has one).
- [ ] **Never add a schedule without an estimate.** State the cadence, the per-run cost, and who reads the output. A cron nobody reads is pure spend forever.
- [ ] **Don't add a required check that can fail to report.** A workflow-level `paths-ignore` on a required check hangs the PR as _"Expected — waiting for status"_ forever. This is why `ci-success` exists as a separate always-reporting gate — read the header of `continuous-integration.yml` before restructuring it.
- [ ] **If the merge queue is re-enabled, a required check must trigger on `merge_group`.** A PR-only workflow can never report inside the queue, so GitHub waits until `check_response_timeout_minutes` expires and then dequeues the PR. The queue is currently off (see § Merge queue on `main`), but keep new required checks queue-safe anyway.
- [ ] **If you disable something, leave a reason and an owner.** `if: false` with no explanation becomes permanent. Link back to this doc.

---

## Open items

- **Blacksmith's per-minute rate** was never confirmed against an invoice; the ~$34–67/month range brackets two plausible rates. Now moot unless paid runners return.
- **`NX_KEY` is an unreferenced repo variable** and should be deleted from repo settings. It was also stored as a **variable rather than a secret** — Actions variables are not masked in logs. A licence key belongs in `secrets`.
- **`gs://openthrottle-staging-nx-cache`** is kept for a soak period after the cache retirement; delete it around **2026-09-01** so the 90-day lifecycle stops paying storage on dead entries.
- **Nx Powerpack licence type** (paid vs Nx's free-for-OSS grant) is unconfirmed — needs the Nx account. Moot now that `@nx/gcs-cache` is removed.
- **`nx affected --target=test` still runs at Nx's default concurrency.** The step has no
  `--parallel` flag (so 3), despite prose here and elsewhere having long called it
  "`--parallel=1`" — that claim was never true of the live command and has been corrected in
  place. Sharding (below) does **not** settle this: it changes which projects share a box, not
  what happens when two heavy jsdom suites land on the same one. The evidence needed can only be
  gathered on CI; see the comment above that step in `continuous-integration.yml`.

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
