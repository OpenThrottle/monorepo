# Lane-parallelism feasibility audit

Whether the lane-parallel sibling plan (cross-task execution — several tasks in one plan run
concurrently, each in its own agent "lane") is worth building at all. This is read-only analysis
over historical OT plans; it changes no plan, no task, and no code path. **The answer this audit
reaches is NO — the corpus does not show enough wide, substantial concurrency to justify the
engineering cost.** The reasoning and the numbers behind that verdict are below.

Requested for OT plan `c22e5ba1` (the wave-encoding plan) as the measurement that gates its
lane-parallel sibling.

## Why this can't just be measured

[task-wave-encoding.md](./task-wave-encoding.md) added a nullable `tasks.wave` column, but nothing
populates it yet: no historical plan carries wave data, and the column is not backfilled. So
"how much parallelism exists in past plans" has to be **derived** from what the rows already
carry — `category`, `description` (which on real plans names specific files and paths), and
`requirementsJson` — rather than read off a `wave` column. That derivation, its precision, and its
blind spots are the subject of this doc.

## The threshold, stated before the results

Decided before pulling a single task row, and not revised after seeing the numbers below:

> Build the lane-parallel sibling plan only if **both** hold across the corpus:
>
> 1. **At least 40% of plans** have a derived widest layer ≥ 3, **and**
> 2. **The median widest layer** across the corpus is ≥ 2.
>
> If either fails, the answer is NO — not "build a smaller version," not "revisit later,"
> unless the underlying plan-authoring style changes enough to warrant re-measuring.

The reasoning behind picking 3 and not 2 as the interesting width: a width-2 layer buys a
theoretical ~1.3–1.5x wall-clock improvement on that slice of the plan, and per
[task-wave-encoding.md § Waves do not by themselves grant concurrency](./task-wave-encoding.md#waves-do-not-by-themselves-grant-concurrency),
concurrency is capped and validated seriously — the `ot-loop` eligibility test, plus whatever the
sibling plan's per-lane validation story turns out to be. A tool that pays real engineering and
runtime cost (worktree sharing, join barriers, N-way validation) to convert a minority of
width-2 layers into that improvement is a wash at best. Width ≥ 3 is the point where the
theoretical upside starts to plausibly clear that bar. The 40%-of-plans bar is a "common enough to
be worth building for," not "exists somewhere" bar — a capability that helps 10% of plans a little
is not worth a permanent addition to the execution model.

## Corpus and sampling

- **Population:** all plans with `status = COMPLETED` as of 2026-09-18 — **927 plans**. COMPLETED
  is the most informative status because these plans actually ran; `list_plans_by_status` was
  paged in full (5 pages of ≤200) to confirm the count and build the population list.
- **Sample:** a **systematic sample of 40 plans**, drawn by sorting the population by `createdAt`
  ascending and taking every `⌊927/40⌋ = 23`rd plan (indices `0, 23, 46, …`). This spans the full
  history (2026-01-31 through 2026-09-10) rather than clustering in one era of plan-authoring
  style, which matters because plan-authoring got visibly richer over time (early plans have empty
  `requirementsJson` and terse descriptions; recent plans carry acceptance criteria and named file
  paths per task).
- **One sampled plan (`c91843b1`, "Test Plan 3b") had zero tasks** and was excluded from the
  width/layer statistics, leaving **39 informative plans**.
- Every task row for all 40 sampled plans was pulled with `get_tasks_by_plan_id` (40 calls) between
  2026-09-18 00:00 and 01:30. No plan or task was modified; no OT write tool was called.
- The full 40-plan ID list, in sample order, with `createdAt`:

  | #   | Plan ID                                | Created    | Title                                      |
  | --- | -------------------------------------- | ---------- | ------------------------------------------ |
  | 1   | `746ac8b1-6963-4b2a-8320-6a26d0ee011a` | 2026-01-31 | Migrate notes and plans route guts         |
  | 2   | `e5db953b-8938-45b3-8961-07d9b3d22d3f` | 2026-01-31 | Add canceled status to plans and tasks     |
  | 3   | `557df92f-98da-467c-a5a0-db3ce717c428` | 2026-02-02 | Plans route: multi-select filters          |
  | 4   | `c91843b1-59f2-4541-b554-25810e036403` | 2026-02-05 | Test Plan 3b (0 tasks — excluded)          |
  | 5   | `260a3b32-8211-491f-825c-ef5ef73e1883` | 2026-02-09 | Implement OpenThrottleCommander            |
  | 6   | `d84f60df-abd9-4ca8-bcc3-a0928b4dc4a5` | 2026-02-10 | Audit openthrottle naming references       |
  | 7   | `148b0257-a26b-4678-bfdc-585691b76c1a` | 2026-02-11 | Server/task run perf stats                 |
  | 8   | `333fe706-0c90-4156-b82c-bca92cfabd94` | 2026-02-12 | PlansToolbar single-row layout             |
  | 9   | `6e7d43ff-c428-405c-ada8-848fc75dc0c6` | 2026-02-13 | Compact DashboardQueueStats                |
  | 10  | `30e097b2-80c2-41a1-9d08-2e45adaeba1f` | 2026-02-22 | Test Plan 3                                |
  | 11  | `9f50e133-2090-4c89-921e-8ea830076c89` | 2026-03-10 | Replace placeholder READMEs                |
  | 12  | `a8ad2629-2535-49ab-b685-80cc72c3ada6` | 2026-03-28 | Audit package.json description fields      |
  | 13  | `acd958e9-4b28-4f3a-8b6a-7997f25e5b32` | 2026-05-02 | nestjs-logging keyed JSONL writers         |
  | 14  | `1acff6b8-e2ca-405c-b877-19790ee39412` | 2026-05-06 | Debug BullMQ "Plan not found"              |
  | 15  | `c8be6591-7314-4b43-aaa4-6e4b7ab59e59` | 2026-05-13 | COMMENT ON TABLE for Cortex tables         |
  | 16  | `66fcc765-769f-4927-a856-c12adcd70c0e` | 2026-05-16 | Fix openthrottle-developer test suite      |
  | 17  | `d8f93c92-4a47-4ac7-babe-b786bd6053a4` | 2026-05-21 | Improve react-native-testing mocks         |
  | 18  | `3fa7442e-b80d-4d64-a20f-5580fed58932` | 2026-05-27 | Upgrade to pnpm 10.33.4                    |
  | 19  | `c6e97189-b45a-41d6-852b-959b906d03ab` | 2026-05-31 | Cutover to openthrottle-agentic-utils      |
  | 20  | `d4a1b4f4-1492-4bc6-a546-09bbdaa4a5ca` | 2026-06-06 | Agent assets phase 2.0: semantic search UX |
  | 21  | `7ae3be5c-aed4-4737-afc7-2398515beec8` | 2026-06-10 | Incremental code indexing                  |
  | 22  | `eaa0ee50-38e4-42d6-a270-6a32544d4795` | 2026-06-13 | Harden `nx build --all --parallel`         |
  | 23  | `b28bd5c8-9c90-4b72-9103-a7af795f3d71` | 2026-06-17 | react-router-floor-layout package          |
  | 24  | `0e2c76a8-8039-414a-924e-8f05092625a0` | 2026-06-20 | Improve: openthrottle-server audit         |
  | 25  | `81314a17-a229-4158-af0a-f3d8a3e07592` | 2026-06-20 | Improve: nestjs-bullmq audit               |
  | 26  | `ec7a56aa-6298-4059-8bd8-deacffc01daa` | 2026-07-03 | Toast feedback for submissions             |
  | 27  | `c1fff8e6-34f0-424e-8d75-40109d99ae51` | 2026-07-17 | Authoring guide: OT plans via MCP          |
  | 28  | `90ae04b5-e964-4592-934f-b3c39cf49704` | 2026-07-26 | Gate toolbar actions during a run          |
  | 29  | `ce1e1e94-8e16-4ff9-9297-cdf703127997` | 2026-07-28 | Local model-server endpoint bridge         |
  | 30  | `09568a86-135b-4be6-b561-91d5649dc9c8` | 2026-08-01 | MCP connectors catalog                     |
  | 31  | `0a11ffdd-e0df-4ea0-b551-9de3845503ce` | 2026-08-05 | Fix nx sync "workspace out of sync"        |
  | 32  | `2e227f88-36bc-4a12-8a2a-6278026d3803` | 2026-08-12 | Test-coverage guard-rail (warn-mode)       |
  | 33  | `f9d50d39-e1fd-4656-8ed4-483f2c268778` | 2026-08-14 | Author `ot-onboarding` skill               |
  | 34  | `c84d753c-1817-451f-9377-43a44ffe3734` | 2026-08-16 | Storybook 10 component workbench           |
  | 35  | `48770ad9-5ce3-49ea-9db4-2707faf70f4b` | 2026-08-18 | YouTube "0–60" video pipeline              |
  | 36  | `0443244a-6c74-47c5-b895-a221ccd68dab` | 2026-08-24 | Teardown ot-workflow-orchestration skill   |
  | 37  | `385cecb0-612b-40ab-912d-a346a1250e14` | 2026-08-28 | Refresh /settings/workspace UI             |
  | 38  | `b612f8db-df76-4f32-9759-9d61b3db5093` | 2026-08-29 | Personal (user) skills tier                |
  | 39  | `79e8c132-b98a-4bb0-b399-a513dac8750f` | 2026-09-05 | Close gaps in unsupervised plan_runs       |
  | 40  | `e4bca7d5-87b1-4218-ba64-40046623e6af` | 2026-09-10 | Trim the ot-plans skill                    |

  (Plan `f9c8e688-ec14-43cf-9438-8c9b758feba9`, cited in the task brief as an example of a plan
  whose descriptions name concrete files, is **not COMPLETED** — it is `PENDING` — and is not part
  of the corpus or the sample. It was read for calibration only.)

## Derivation method (apply this to reproduce the numbers)

No `wave` data exists, so layers are inferred by walking each plan's tasks **in `sortOrder`**
(the authored, canonical order) and applying these rules in order:

1. The first task starts layer 1.
2. A task starts a **new layer** (a hard barrier) if any of:
   - Its description or `requirementsJson` explicitly names a dependency on an earlier task or an
     external gate — phrasing such as "depends on", "blocked on", "gates the rest of the plan",
     "as the LAST task", "after task N", "based on the design/spike/decision in task N", "once X
     lands".
   - It is a **validation, integration, or closing task** that operates over the plan's changes as
     a whole (final `lint`/`typecheck`/`test`/`build` pass, PR-open, cross-cutting docs summary,
     "verify everything").
   - It names a file, directory, or symbol that **overlaps** a task already assigned to the
     currently open layer (a same-file or same-symbol edit is a real conflict regardless of
     narrative independence).
3. Otherwise, if the task's named files/paths are **disjoint** from every task currently in the
   open layer, it **joins** the open layer.
4. The **widest layer** for a plan is the layer with the most tasks; **layer count** is the number
   of layers after this walk.

This was applied by reading each task's `title`, `description`, and `requirementsJson` returned by
`get_tasks_by_plan_id` and reasoning through the rule above — not by a deterministic script (no
tool here can execute code that reads MCP tool output directly; see Limits). Anyone re-running this
should get the same layer counts from the same 40 plan IDs by applying the four rules above in
`sortOrder`, because the input (task rows) doesn't change and the rules are mechanical apart from
judgment calls flagged inline in the per-plan table below.

### Two ways this method fools itself if applied carelessly

**1. Disjoint files is necessary, not sufficient.** Two "audit remediation" plans in the sample —
`0e2c76a8` (openthrottle-server) and `81314a17` (nestjs-bullmq) — have the _same shape_: a security
audit's numbered findings, one task per finding, narratively independent of each other. `0e2c76a8`
really is wide (widest layer 7 of 7 tasks: each finding lives in its own resolver/service file).
`81314a17` is nearly the opposite (widest layer 1): its findings almost all edit the same two files
(`nestjs-bullmq.module.ts`'s `defaultJobOptions` block and `nestjs-bullmq.config.ts`), because a
small package concentrates its logic in few files. Reading titles alone ("P0", "P1", "P2" —
independent-sounding) would have called both plans equally parallel. Only checking the actual named
paths per task caught the difference. Likewise, `d4a1b4f4` (semantic search UX) and `ce1e1e94`
(local model bridge) each open with a design/spike task whose `requirementsJson` says outright
"Blocked on plan 1.5 ingest" / "gates the rest of the plan" — every later task in those plans, even
ones touching totally disjoint files, is sequential behind that one decision. A naive
disjoint-files scan without reading the prose would have missed both traps.

**2. Width is not free — task size and validation cost have to be weighted in.** The single widest
layer in the whole sample is `a8ad2629` ("Audit NX project package.json description fields"):
**100 tasks in one layer**, each editing exactly one distinct `package.json`'s `description` field.
Every task is genuinely disjoint (100 different files) and genuinely independent (no task
references another). By the raw rule, this is the strongest parallelism candidate in the corpus.
It is also the worst possible advertisement for lane-parallel execution: each task is a
one-line JSON edit taking seconds, and per
[task-wave-encoding.md](./task-wave-encoding.md#why-a-layer-and-not-a-dag), the executor still has
to open a group, run agents, join, and validate — for a 100-way fan-out of one-line edits, that
overhead dwarfs the work. This plan should have been a single loop or a batch script, not 100
lanes. `746ac8b1` (11-wide) has the same flavor at a smaller scale: eleven small route-porting
tasks, pre-dating the per-task `lint`/`typecheck`/`test` convention entirely (no task in it mentions
running a validation gate). Both outliers are excluded from the "is this common and worthwhile"
judgment below for exactly this reason — width without validation-worthy task size is not the thing
the sibling plan would be built to capture.

## Per-plan results

| Plan                                         | Tasks | Layers | Widest layer | Note                                                                                                                          |
| -------------------------------------------- | ----- | ------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `746ac8b1` Migrate notes/plans routes        | 13    | 3      | **11**       | Old-style CRUD port, no per-task validation gates; see outlier note above                                                     |
| `e5db953b` Add canceled status               | 3     | 2      | 2            | Migration + UI disjoint; docs task trails                                                                                     |
| `557df92f` Multi-select filters              | 4     | 2      | 2            | Component + API parallel; two consumer filters parallel after                                                                 |
| `c91843b1` Test Plan 3b                      | 0     | —      | —            | Excluded (no tasks)                                                                                                           |
| `260a3b32` OpenThrottleCommander             | 6     | 4      | 3            | Component, types, and config land in parallel; composition/mount/tests are sequential after                                   |
| `d84f60df` Audit naming references           | 7     | 2      | **6**        | Six disjoint read-only audit areas, one collation task; cheap tasks, real width                                               |
| `148b0257` Server perf stats                 | 6     | 4      | 2            | Design gate, then narrow implementation chain; tasks never left PENDING                                                       |
| `333fe706` PlansToolbar compact layout       | 7     | 7      | 1            | Six of seven tasks edit the same toolbar file in sequence — fully serial                                                      |
| `6e7d43ff` Compact DashboardQueueStats       | 1     | 1      | 1            | Single task                                                                                                                   |
| `30e097b2` Test Plan 3                       | 1     | 1      | 1            | Single task                                                                                                                   |
| `9f50e133` Replace placeholder READMEs       | 5     | 2      | 4            | One audit task, then four disjoint README files in parallel                                                                   |
| `a8ad2629` Audit package.json descriptions   | 101   | 2      | **100**      | See outlier note above — trivial one-line edits, not a real candidate                                                         |
| `acd958e9` Keyed JSONL writers               | 6     | 5      | 2            | Discovery → spec → implement chain; only one parallel pair near the end                                                       |
| `1acff6b8` Debug BullMQ "Plan not found"     | 4     | 4      | 1            | Classic debug chain: locate → repro → fix → verify                                                                            |
| `c8be6591` COMMENT ON TABLE batches          | 3     | 3      | 1            | All three batches write the same migration file                                                                               |
| `66fcc765` Fix developer test suite          | 8     | 3      | 6            | Baseline task, six disjoint test-file fixes in parallel, one final verify                                                     |
| `d8f93c92` react-native-testing mocks        | 7     | 3      | 3            | Two audits + a spike in parallel, refactor gate, three follow-ons in parallel                                                 |
| `3fa7442e` Upgrade to pnpm 10.33.4           | 8     | 3      | 5            | Five disjoint config edits in parallel (version already fixed in advance); lockfile/verify chain after                        |
| `c6e97189` Cutover to agentic-utils barrel   | 6     | 5      | 2            | Real file overlaps among the "independent" renames force a mostly-serial chain                                                |
| `d4a1b4f4` Agent-assets search UX            | 3     | 3      | 1            | Design (gated on another plan) → implement → summary; fully serial                                                            |
| `7ae3be5c` Incremental code indexing         | 4     | 4      | 1            | Storage → service wiring → tests → verify; fully serial                                                                       |
| `eaa0ee50` Harden `nx build --parallel`      | 5     | 4      | 2            | Baseline, two independent race fixes in parallel, guardrail, verify                                                           |
| `b28bd5c8` react-router-floor-layout package | 10    | 9      | 2            | Single-package build; almost entirely a linear state→hooks→canvas→interactions→compose→test→docs→validate chain               |
| `0e2c76a8` openthrottle-server audit         | 7     | 1      | **7**        | Seven disjoint-file findings, no cross-references — the genuine wide case                                                     |
| `81314a17` nestjs-bullmq audit               | 7     | 7      | 1            | Same plan _type_ as above, but findings collide on two shared files — fully serial                                            |
| `ec7a56aa` Toast feedback                    | 4     | 4      | 1            | Inventory → convention → wire → test; fully serial                                                                            |
| `c1fff8e6` Authoring guide doc               | 7     | 7      | 1            | One doc, seven sections, sequential edits to the same file                                                                    |
| `90ae04b5` Gate toolbar during a run         | 5     | 4      | 2            | Predicate, then two toolbar files gated on it in parallel, then verify, then an injected commit task                          |
| `ce1e1e94` Local model endpoint bridge       | 7     | 5      | 2            | Design gate ("gates the rest of the plan"), then a mostly-linear driver→server→UI chain with one parallel pair                |
| `09568a86` MCP connectors catalog            | 7     | 5      | 2            | Design gate, then migration+seed in parallel, then a linear GraphQL→routes chain with one parallel pair                       |
| `0a11ffdd` Fix nx sync hard-fail             | 5     | 5      | 1            | Characterize → decide → implement → validate → docs; fully serial                                                             |
| `2e227f88` Test-coverage guard-rail          | 6     | 4      | 3            | Spec → build script, then three consumers of the script in parallel, then triage                                              |
| `f9d50d39` `ot-onboarding` skill             | 6     | 6      | 1            | Skeleton, then five sections written into the same SKILL.md in sequence                                                       |
| `c84d753c` Storybook 10 workbench            | 10    | 9      | 2            | Single-app build; long linear chain (catalog deps → scaffold → wiring → generator → stories → docs) with brief parallel pairs |
| `48770ad9` YouTube "0–60" pipeline           | 12    | 7      | 3            | Spec, then script/spike/seed in parallel, then a long linear pipeline-stage chain                                             |
| `0443244a` Teardown a skill                  | 6     | 5      | 2            | Archive → delete → doc strip → re-sync, with the OT-plan reconciliation running alongside validation                          |
| `385cecb0` Refresh /settings/workspace UI    | 5     | 4      | 2            | Two independent sections, then dependent composition/rhythm/validation passes                                                 |
| `b612f8db` Personal skills tier              | 10    | 6      | 5            | Design + core mechanism gate two layers, then five independent extensions of that mechanism in parallel                       |
| `79e8c132` Unsupervised plan_runs janitor    | 4     | 2      | 2            | A design task and an unrelated review run in parallel; two consumers of the design run in parallel after                      |
| `e4bca7d5` Trim `ot-plans` skill             | 8     | 5      | 3            | Design gate + doc trim + an independent audit run in parallel; the rest is a short dependent chain                            |

## Corpus-level distribution

39 informative plans (the empty `c91843b1` excluded).

| Widest layer            | Plan count | Share |
| ----------------------- | ---------- | ----- |
| 1 (strictly sequential) | 12         | 30.8% |
| 2                       | 14         | 35.9% |
| 3                       | 5          | 12.8% |
| 4                       | 1          | 2.6%  |
| 5                       | 2          | 5.1%  |
| 6                       | 2          | 5.1%  |
| 7                       | 1          | 2.6%  |
| 11                      | 1          | 2.6%  |
| 100                     | 1          | 2.6%  |

- **Share strictly sequential (widest layer = 1): 30.8%** — for these plans, lane-parallel execution
  buys nothing regardless of how well it is built.
- **Share widest ≤ 2: 66.7%** — two-thirds of plans never open a layer wider than 2.
- **Median widest layer: 2.** **Mean: 5.1**, pulled almost entirely by the two outliers
  discussed above (`a8ad2629` at 100 and `746ac8b1` at 11); excluding those two, the mean drops to
  **2.4** over the remaining 37 plans.
- **Share widest ≥ 3: 33.3%** (13 of 39 plans) — below the 40% threshold set in advance. Of those
  13, roughly half (`d84f60df`, `9f50e133`, `a8ad2629`, `e4bca7d5` in part) are cheap
  audits/one-liners/doc-trims rather than tasks that would each need a full validation pass, which
  is a further discount on the theoretical upside this number already suggests.

## Weighing wall-clock against validation cost

Per the task brief: N lanes mean N potential validation passes, not just N times less wall-clock.
The corpus makes this concrete in both directions:

- **`0e2c76a8`** (widest layer 7) is the strongest real candidate in the sample — seven genuinely
  disjoint, substantial findings, each of which the task descriptions say ends with its own
  `lint`/`typecheck`/`test` pass of `openthrottle-server`. Seven lanes here would mean seven full
  validation passes of the same project, which is exactly the cost the brief warns about; a
  batched sibling design (2–3 findings per lane, not 7) would very likely win more than a
  fully-fanned-out one.
- **`a8ad2629`** (widest layer 100) is the cautionary extreme: 100 lanes for tasks that take
  seconds each would spend more wall-clock on lane setup, join, and validation overhead than the
  work itself.
- The two single-package builds (`b28bd5c8`, `c84d753c`, each 9–10 layers deep with a widest layer
  of only 2) show the more typical shape of a real feature plan: mostly an unavoidably linear
  state → implementation → tests → docs → validate chain, with only brief 2-wide moments. Even a
  perfect lane-parallel executor recovers only a small fraction of that chain's total length.

## Limits of this derivation

- **No ground truth.** No historical plan carries `wave` data (that is the entire premise of this
  audit), so there is nothing to check the derived layers against. This is inference from
  authored prose and file paths, not measured execution.
- **Human/LLM-applied rules, not a script.** The four-rule method above was applied by reading each
  plan's task JSON from `get_tasks_by_plan_id`; it is mechanical enough that a script could apply it
  (title/description keyword matching for the gating phrases, path-set intersection for the
  disjointness check), but no such script was written or is committed here. Re-running this exact
  audit means re-fetching the 40 plan IDs above and re-applying the four rules; a careful reader
  should reach the same layer counts, modulo the judgment calls called out inline in a few rows
  (`148b0257`, `c6e97189`, `c84d753c` in particular have real ambiguity in where exactly a
  same-file conflict falls).
- **A 40-plan systematic sample, not the full 927.** Systematic sampling by `createdAt` avoids
  clustering in one era, but a 4.3% sample cannot rule out that the true distribution is
  meaningfully different, especially at the tails (there is exactly one 100-wide and one 7-wide
  plan in the sample; a different sample might catch zero or several).
- **"Disjoint files" is judged from the paths named in prose, not a diff.** No task in this corpus
  ever ran under lane-parallel execution, so there is no actual patch to check for real file
  overlap — only what each task's author wrote down. A task whose description doesn't mention a
  file it silently touches (or mentions one it doesn't) would be misclassified.
- **What "a full validation pass" costs is asserted from task language ("lint/typecheck/test"
  mentioned), not measured.** Actual CI wall-clock time per validation pass was not measured for
  this audit.
- **The sibling plan's actual lane/validation model is not yet designed**, so "N lanes means N
  validation passes" is this audit's working assumption per the task brief, not a fact about a
  concrete implementation. If the eventual design validates once per wave-join (as the _existing_
  intra-task fan-out already does, per
  [task-wave-encoding.md](./task-wave-encoding.md#waves-do-not-by-themselves-grant-concurrency))
  rather than once per task, the cost side of this calculus changes and the threshold above should
  be re-evaluated against that concrete design — not reused as-is.

## Verdict: NO-GO

The threshold fails against the observed corpus. It is an AND of two conditions, and the first one
misses:

1. **33.3%** of plans have widest layer ≥ 3 — below the 40% bar. **This is the condition that
   fails, and it is the whole verdict.**
2. The median widest layer is 2, which does clear the second bar. That is not a partial pass worth
   leaning on: the composite is an AND by construction, precisely so that "plans have _some_ width"
   could not on its own justify the build.

More importantly, the numbers describe a corpus where:

- **Almost a third of plans are strictly sequential** — no benefit possible regardless of
  implementation quality.
- **Two-thirds never exceed a layer of 2** — the point below which the brief's own concern (N lanes
  need N validation passes) plausibly cancels out the wall-clock win.
- The plans that _are_ wide skew toward either (a) cheap, low-value width (one-line audits, README
  swaps, doc collation) where a simple loop or batch already does the job without new
  infrastructure, or (b) a narrow 2-wide peak inside an otherwise long, unavoidably linear
  single-feature build, where the total wall-clock recovered is small relative to the plan's length.
- The one unambiguous "this is exactly what lane-parallelism is for" case in the sample
  (`0e2c76a8`, and its near-mirror-image sibling `81314a17`) also demonstrates the failure mode
  most likely in practice: two narratively-identical "independent findings" plans, one of which is
  fully serial once the actual files are checked. A general-purpose lane-parallel executor would
  need real static analysis of the concrete diff to tell these two apart reliably — the same class
  of design problem [task-wave-encoding.md](./task-wave-encoding.md) rejected the DAG (`depends_on`)
  option over, for the same reason (authoring cost and error-proneness of hand-declared
  independence).

**Recommendation: do not build the lane-parallel sibling plan** in its currently-imagined
general-purpose "any two independent tasks in a plan may run concurrently" form. The corpus does
not show the concurrency is common enough, wide enough, or made of substantial-enough tasks to earn
back the cost of cross-task worktree sharing, join barriers, and per-lane validation. If a narrower
version is ever considered, the cheap-audit case (`d84f60df`, `66fcc765`, `9f50e133`, `0e2c76a8`
style: many disjoint, similarly-sized findings/files from one audit or fix-list, explicitly not
gated on each other) is the one place in this sample that would clearly benefit — but that is a
much smaller, more mechanical tool (closer to a bounded parallel batch-runner for a known-flat task
list) than a general lane-parallel executor, and it should be scoped and named as that if it is
ever proposed.

## See also

- [task-wave-encoding.md](./task-wave-encoding.md) — the `wave` column this audit's premise rests
  on, why it is a layer and not a DAG, and why an unpopulated plan runs sequentially.
- [per-task-model-routing.md](./per-task-model-routing.md) — another "measure the real corpus
  before building the mechanism" audit, on model routing rather than concurrency.
- `skills/ot-loop/SKILL.md` — the disjoint-file-set eligibility test this audit's derivation rule
  borrows from, and the existing intra-task fan-out validation discipline.
