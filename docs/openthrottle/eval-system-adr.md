# ADR: an OpenThrottle-native eval system

- **Status:** Proposed — awaiting sign-off (design gate)
- **Date:** 2026-11-05
- **Plan:** OT `af00f30f-575d-41b4-954e-2768706cce46`, task `2b6d1b4e` (this design gate)
- **Source:** Sergii Makarevych, _Evals: how to know whether an AI system actually works_
  (x.com/sermakarevich/status/2106453816757354947)
- **Versions checked:** ATIF **v1.8** (Harbor RFC 0001, April 2026); Harbor agent list as published
  2026-11-05; inspect_swe 0.2.52; Coder Eval `main` 2026-11-05
- **Related:** [agentic-hooks-standards-adr.md](../monorepo/agentic-hooks-standards-adr.md) (OTel
  GenAI conventions), [features.md](./features.md) (preview flags),
  [plan-run-worktrees.md](./plan-run-worktrees.md), OT plan `012fa4b0` (critic panel)

Every claim about an external project below has a shelf life. Re-check them before relying on this
document after mid-2027.

## Context

OpenThrottle drives six agent CLIs (`antigravity`, `claude`, `codex`, `cursor`, `grok`, `opencode`) and has no way to say, with a number it can trust, whether a change to a skill, prompt,
driver or model made a run better or worse. Two gaps are visible in the code:

- **Run transcripts are thrown away.** Plan runs spawn agents through `runDriverAsync`
  (`tools/workflows/src/bin/runIteration.ts`, plus the scheduled-agent runner). Only
  `drivers/claude.ts` implements `AgentDriver.parseOutput`, and it keeps only the final text and the
  usage-limit signal. The other five drivers run in plain-text mode. Nothing records tool calls,
  tokens, cost, duration and exit status together, and `agent_token_usage` has no `plan_run_id`.
- **One eval exists and it is narrow.** `packages/openthrottle-mcp/src/evals/tool-selection/`
  grades first-turn MCP tool selection with trials, per-model baselines and a regression exit code.
  It is the pattern to generalize, not a home for agent evals.

The article's method is adopted wholesale as the acceptance bar. In short: gold cases split into a
tuning (dev) set and a reporting (test) set; read transcripts before writing graders; code graders
wherever a check is definite; binary judges with evidence, calibrated against human labels by kappa;
an interval on every rate and a paired comparison for every A/B; pass^k and cost per success for
agents; a held-out grader nothing optimizes against.

## Decision 1 — OT-native, not an external harness

**Build the eval loop inside OT, and run the system under test through OT's own drivers.**

The open-source harnesses compared were Harbor (MIT, covers all six of our CLIs), Inspect AI with
inspect_swe (MIT; claude, codex, gemini), Coder Eval (Apache-2.0; no cursor or grok), agent-exam and
promptfoo (MIT, OpenAI-owned since March 2026). Every one of them installs and invokes the CLI
through **its own adapter**. That measures "Claude Code as Harbor runs it", not "Claude Code as OT
runs it" — our argv, `--plugin-dir` hooks, worktree provisioning, prompt layering and
usage-limit handling. Those are exactly what our changes touch, so they must be inside the system
under test.

Because the runner goes through `DRIVER_REGISTRY`, every current and future driver is evaluable
without new eval code.

**Not ruled out:** Harbor as a cross-check and for public benchmarks (Terminal-Bench, SWE-bench),
once container isolation exists. Decision 3 keeps that door open at zero cost.

## Decision 2 — Capture both paths; the first dataset comes from spawned runs

| Path                  | Who spawns the agent               | Drivers covered | Capture                                                                             | Role                                                         |
| --------------------- | ---------------------------------- | --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Spawned plan runs** | OT (`runDriverAsync`)              | all 7           | driver stdout, structured mode (Decision 4)                                         | **First dataset**; replayable across a driver × model matrix |
| **ot-loop sessions**  | the user's own Claude Code session | claude only     | Stop hook uploads the session transcript (`transcript_path` is in the Stop payload) | Real-failure source for error analysis                       |

**Session uploads, as built (2026-11-06; granularity, privacy and subagents chosen by the user):**

- **One row per OpenThrottle task.** The transcript records its own boundaries: each
  `begin_task_session` call (with its `taskId`) opens a segment, and the next one or
  `settle_plan_run` closes it. Only closed segments upload. A segment's run is the last
  `register_plan_run` result before it, falling back to the session's run and then to the MCP's
  backstop file.
- **Only task segments leave the machine,** so a session that never began an OpenThrottle task
  uploads nothing. Upload is on by default, with `OPENTHROTTLE_SESSION_TRAJECTORIES=0` to turn it
  off.
- **Subagents** spawned in a segment (`toolUseResult.agentId` → `subagents/agent-<id>.jsonl`)
  are embedded as ATIF `subagent_trajectories`, each capped at 160 KiB.
- **Where the code lives.** The reading is pure (`claude-session.ts` in `agentic-utils`). The
  hook (`agentic-hooks` `adapters/claude/session-trajectory.ts`) owns I/O. It reads incrementally
  from a per-session offset, keeps an upload state per session, and buffers or dead-letters
  through the same JSONL machinery as token usage.

Skills (trigger tests, with/without ablation) are the second target, after the first loop works end
to end.

## Decision 3 — Trajectory format: ATIF v1.8, pinned

Store every run as an **Agent Trajectory Interchange Format** document, `schema_version:
"ATIF-v1.8"`, rather than inventing a format.

- It is an open, versioned spec with a changelog. It models exactly what we need: ordered
  user/agent/system steps, `tool_calls` with matching `observation` results, per-step and
  `final_metrics` (prompt tokens including cached, completion tokens, cost), and embedded
  `subagent_trajectories`.
- It is what Harbor's viewer, loaders and datasets read. A trajectory we store is a trajectory
  Harbor can display and a future cross-check can consume.
- **Why not OTel GenAI semantic conventions:** they are still pre-stable (see the hooks ADR), and they
  describe spans for live telemetry, not a self-contained replayable document a grader reads.

**OT-specific fields go in the root `extra`**, under one key so they never collide with a future
spec field:

```json
{
  "extra": {
    "openthrottle": {
      "driver": "codex",
      "exitCode": 0,
      "headShaAfter": "…",
      "headShaBefore": "…",
      "outcome": "succeeded",
      "planId": "…",
      "planRunId": "…",
      "taskId": "…",
      "worktreePath": "…"
    }
  }
}
```

Bumping the pinned version is a deliberate change with its own migration note, never a silent
upgrade.

## Decision 4 — One converter, reusing the chat path's parsers

The chat path already solved per-CLI parsing. `packages/openthrottle-agentic-utils/src/utils/
conversation-backend/<cli>/events.ts` maps each CLI's structured output (claude `stream-json`,
`codex exec --json`, cursor/antigravity `stream-json`, opencode and grok JSON) onto one
`ConversationStreamChunk` stream: `text`, `thinking`, `tool_call`, `tool_result`, `usage`,
`session`.

So capture is:

1. **Plan-run drivers switch to structured output.** Each driver's `buildShellCommand` adds its CLI's
   structured-output flag (the same flags the chat argv builders already use), and a
   `renderOutputLine` keeps `plan_output_stream` and the run log human-readable, exactly as claude
   does today.
2. **The chat event mappers are reused** for plan-run stdout. No second set of six parsers.
3. **One `chunksToAtif` converter** turns the chunk stream plus run metadata into ATIF.

**Placement follows the dependency direction.** `openthrottle-agentic-utils` depends on
`openthrottle-drivers`, so neither the parsers nor the converter can live in the drivers package.

_As built (task 2, 2026-11-06):_

- **Drivers.** They gained an opt-in `outputFormat: 'structured'` and a `reportsToolCalls`
  capability. Text stays the default, so a caller that does not opt in can never receive NDJSON it
  cannot read.
- **The wrapper.** `withStructuredOutput(driver)` in `agentic-utils`
  (`src/utils/structured-output/`) switches the flag on and installs the matching `parseOutput` and
  `renderOutputLine`, both built on the chat mappers.
- **The converter.** `chunksToAtif` and the ATIF types live in `agentic-utils` as well
  (`src/utils/trajectory/`, `src/types/atif.ts`), not in the eval package. Capturing a trajectory
  is not eval-specific, and the server already depends on `agentic-utils`. The eval core
  (Decision 7) builds on it.

Recording one real run per CLI showed that the chat mappers do not cover plan-run mode on their own:

- **claude and cursor:** their mappers skip the consolidated `assistant` text, which in chat
  repeats the partial deltas. Plan runs never ask for partials, so the plan-run reader adds that text
  back.
- **opencode 1.18:** it renamed its `tool` event to `tool_use`. The mapper now accepts both, which
  also fixes the chat tool cards.
- **codex and opencode:** both report a tool only once it finishes. The converter synthesizes the
  call from the result and marks it `synthesized_from_result`.

A driver whose CLI cannot report tool calls declares that in its capabilities, and its trajectories
are marked incomplete. They are never silently stored with an empty `tool_calls` array.

**Doc drift found on the way:** the codex, cursor-agent, grok and opencode mappers each cite a
`docs/openthrottle/<cli>-stream-json-schema.md` that does not exist. Only the claude and
antigravity schema docs are present. Task 2 writes the four missing ones alongside the fixtures.

## Decision 5 — Storage: Postgres JSONB, with caps

One table, `agent_trajectories`. It is queryable, it lives in the existing database, and it is
covered by the existing backups.

- **Columns:** `id`, `plan_run_id`, `task_id` (nullable), `source` (`spawned` | `session_upload`),
  `driver`, `model`, `schema_version`, `trajectory` (JSONB), and summary columns graders and
  reports filter on without parsing JSONB: `tool_call_count`, `input_tokens`, `cached_tokens`,
  `output_tokens`, `cost_usd` (nullable when unpriceable), `duration_ms`, `exit_code`, `outcome`,
  `byte_size`, `truncated`, `incomplete`, `created_at`.
- **Caps:** each tool observation is truncated at **16 KiB**, keeping its head and tail with an
  elision marker. A whole trajectory is capped at **4 MiB**: past that, the oldest observations are
  elided first. `truncated` records that either happened.
- **Retention:** trajectories referenced by an eval case or a human label are kept indefinitely.
  Everything else is pruned after **90 days**, configurable, by a scheduled sweep.
- **Capture fails open.** A capture error is logged and never fails or slows the run.
- **Transport cap.** The client caps each trajectory to **640 KiB** before sending it
  (`TRAJECTORY_TRANSPORT_BYTES`). The server's JSON request limit is 1 MB, and the document travels
  as an escaped string inside the body. The 4 MiB storage cap stays on the server as a backstop. If
  real trajectories are often trimmed, raise the body limit for this mutation rather than the cap.
- **As built (task 4, 2026-11-06):**
  - **Capture path.** Every spawned iteration goes through `runIterationAsync` in
    `tools/workflows`, both from the server's orchestrator and from a detached `workflow-ralph`.
    It runs the agent through `withStructuredOutput` and gets the raw stdout from the engine's new
    `onRawOutput` hook, then builds the record (`buildTrajectoryRecord`). It hands the record to an
    `onTrajectory` callback that sends `recordAgentTrajectory`.
  - **What's covered.** Only runs with a `plan_runs` row record anything. Interactive TTY runs
    use the sync path and stay in text mode, and scheduled agent jobs, which have no plan run, are
    out of scope.
  - **Server side.** The resolver validates the document (`parseAtifTrajectoryJson`), re-applies
    the storage cap, and derives the summary columns itself (`summarizeTrajectory`), so a client
    cannot send a summary that disagrees with its document.

## Decision 6 — Data model (scoped per project)

Evals are a product feature (Decision 10), so datasets belong to a repository from the start, not
to this monorepo.

| Table                | Purpose                              | Key columns                                                                                                                           |
| -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `agent_trajectories` | One run's record                     | Decision 5                                                                                                                            |
| `eval_datasets`      | A versioned case set                 | `repository_id`, `name`, `target` (`plan_task` \| `skill` \| …), `version`                                                            |
| `eval_cases`         | One input with its gold answer       | `dataset_id`, `split` (`dev` \| `test`), `input` JSONB, `gold` JSONB, `source_trajectory_id` (the real failure it came from)          |
| `eval_runs`          | One configuration run over a dataset | the configuration (`driver`, `model`, `effort`, prompt/skill content SHAs, `auth_mode`), `dataset_version`, `k`, `status`, `budget`   |
| `eval_trials`        | One attempt at one case              | `run_id`, `case_id`, `attempt` (1..k), `trajectory_id`, `status` (incl. `usage_limited`)                                              |
| `eval_grades`        | One grader's verdict on one trial    | `trial_id`, `grader_id`, `grader_version`, `judge_driver`/`judge_model` (judges only), `verdict`, `evidence`, `cost_usd`, `cache_key` |
| `eval_human_labels`  | Ground truth for calibration         | `trial_id` or `trajectory_id`, `rater` (GitHub username), `verdict`, `failure_type`, `note`                                           |

`verdict` is modeled as a discriminated union in TypeScript — `pass`, `fail`, or `error` with a
reason — never a nullable boolean. A grader that crashes is not a grader that failed the case.

## Decision 7 — Package home

A new package, **`@openthrottle/agentic-evals`**, scaffolded with `@tools/generators` (the
`ot-generators` skill picks the generator and tier). It is pure TypeScript with no NestJS
dependency, and it holds:

- the case, dataset, trial and grader types;
- the runner, built on `runDriverAsync`, with k attempts per case and a worktree per attempt;
- the grader SPI (`code` | `judge` | `human`);
- `chunksToAtif`;
- the statistics module (Decision 9).

Entities and repositories go in `packages/nestjs-repositories`; resolvers and queue wiring go in
`openthrottle-server`. The package's export tier follows `packages/AGENTS.md`. It is consumed by the
server, so check the server-consumed-packages rule before choosing source-first.

The MCP tool-selection eval moves onto this core last (task 12). Its per-model baselines and its
"CI runs only the grader" rule are kept. Done: it runs `runEval` with its own `RunEvalIteration` (one
model call, converted to an ATIF trajectory), `noopWorkspaceFactory` and a `code` grader.

## Decision 8 — Credentials: subscriptions allowed, with guard rails

Eval suites may run on subscription-backed CLIs as well as API keys. Because of that:

- **Every run records its auth mode** per driver (`api_key` | `subscription`), resolved at
  preflight, as part of `eval_runs`' configuration. A comparison between runs with different auth
  modes is flagged in the report.
- **Concurrency defaults to 1 per subscription account**, and suites run sequentially unless raised
  explicitly.
- **A usage limit pauses the run; it is not a failure.** Trials that hit the limit get
  `usage_limited` and are excluded from the pass rate. The suite resumes from the first unfinished
  trial using the existing `usage_limited` → resume machinery for plan runs.
- **Budgets are in tokens**, with a USD cap added when every driver in the run is priceable.
  Subscription runs have no reliable per-call price.
- **The docs carry a terms-of-service warning.** Some vendors' subscription terms may not cover
  automated bulk runs, and that risk is the user's to accept per suite.

## Decision 9 — Graders, judges and numbers

- **Code graders first,** one per failure type with a definite check: lint, typecheck and tests on
  the final diff; required files touched; forbidden actions (`--no-verify`, a plan written as
  Markdown, a push to `main`); commit footers present; final git state.
- **Judges** ask one binary question per failure type and must quote evidence. Their input is the
  ATIF trajectory, the diff and the final state, never the chat alone. By default the judge comes
  from a **different model family** than the system under test, run through our own drivers, so
  Decision 8 applies to judges too. Every grade records the judge's driver, model and version.
- **Calibration.** A judge question is measured on the dev split against human labels and reports
  Cohen's kappa, catch rate and false-fail rate. It may **gate** at kappa ≥ 0.6, and may run
  **unsupervised** at kappa ≥ 0.8. Below 0.6 it is reported but non-gating. The same calibration
  API calibrates the critic panel in OT plan `012fa4b0` before that panel gates anything.
- **A held-out judge** that no loop, critic or prompt optimization ever sees.
- **Numbers:** a bootstrap 95% CI on every rate (10,000 resamples, fixed seed, so reports are
  reproducible); paired comparisons with McNemar plus the count of cases that got worse; pass@k
  and pass^k with k = 3 by default; the detection floor printed for the dataset size; cost per
  successful outcome.
- **Caching:** judge calls are cached on (prompt SHA, input SHA, grader version, judge model).
  Agent trials are never cached, because their randomness is the thing being measured. Re-reporting
  a finished run reads the stored trials and grades.

## Decision 10 — A product feature behind `FEATURE_DELTA_PREVIEW`

Evals ship in `openthrottle-developer` as a product feature for any repository: the trajectory
viewer, datasets, runs and reports. They stay hidden behind a new preview flag,
**`FEATURE_DELTA_PREVIEW`**, which follows the existing BETA and CHARLIE preview flags:

- `packages/react-router-utils/src/config/features.ts` (`parseEnvBoolean`),
- `src/types.ts` and `src/utils/environment.ts` (default `'false'`),
- `applications/openthrottle-developer/.env.default` (`FEATURE_DELTA_PREVIEW="false"`),
- an entry in [features.md](./features.md).

The flag gates the **UI only**, as the BETA flag does. **Capture is not gated.** Trajectories
accumulate from the moment task 4 lands, bounded by Decision 5's caps and retention, so there is
data to analyze by the time the UI is switched on.

## Decision 11 — CI and isolation

- **Live suites never run in CI** ([ci-cost.md](../monorepo/ci-cost.md)). CI runs only the unit
  tests for graders, the converter and the statistics, through each package's `test` target.
- **Each attempt runs in its own git worktree,** as plan runs already do. Container isolation is out
  of scope here: it arrives with the Docker agents plan (`eb421ae9`, draft PR #585), and it is the
  prerequisite for the Harbor cross-check.

## Consequences for the plan

- **Task 2 shrinks.** It no longer writes six parsers. It switches the plan-run drivers to
  structured output, adds `renderOutputLine` where missing, records fixture streams, writes the four
  missing schema docs, and builds `chunksToAtif` on the existing mappers.
- **New task: Stop-hook transcript upload** for ot-loop Claude sessions (`source:
session_upload`), after task 4.
- **New task: add `FEATURE_DELTA_PREVIEW`**, before the first UI task (task 5).
- Tasks 3 and 8 implement Decisions 5 and 6. Task 6 implements Decisions 7 and 9. Tasks 10 and 11
  implement Decisions 8–10.

## See also

- [evals-running-suites.md](./evals-running-suites.md): how suites are run (the `eval-<suite>` Nx
  target convention, running across drivers, why live suites never run in CI).

## When to revisit

- ATIF publishes v1.9 or later, or Harbor's agent list drops one of our CLIs.
- The OTel GenAI conventions go stable. At that point, re-ask whether trajectories should also be
  emitted as spans.
- Container isolation lands, which unlocks the Harbor cross-check.
- A judge question stays below kappa 0.6 after three iterations. Replace it with a code grader or a
  specialized detector rather than tuning it further.
