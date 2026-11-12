# Running eval suites

How OpenThrottle eval suites are shaped, run, and kept out of CI. The design is in
[eval-system-adr.md](./eval-system-adr.md) (Decisions 7, 8, 9 and 11); the cost rule is in
[ci-cost.md](../monorepo/ci-cost.md).

## What a suite is

A **suite** is one question measured the same way every time: a dataset of cases, a system under test,
and graders. It runs on the eval core, `@openthrottle/agentic-evals`:

- **Cases** are an `EvalDataset`. A case has a stable id, a prompt, an optional workspace setup, a
  `gold` expectation, and a `split` (`dev` to iterate on, `test` held out).
- **The system under test** is a `RunEvalIteration`. By default that is an agent CLI run through an
  OpenThrottle driver in a fresh git worktree. A suite whose subject is not a CLI supplies its own
  iteration that returns a prebuilt ATIF trajectory, with `noopWorkspaceFactory` when it needs no
  filesystem.
- **Graders** are `code` (a deterministic check), `judge` (one binary question, evidence quoted) or
  `human`. A grader's version changes whenever its meaning does.
- **Numbers** come from `buildEvalReport`: pass rate with a bootstrap 95% CI, pass@k and pass^k, the
  detection floor for the dataset size, and cost per success. An `errored` or `usage_limited` trial is
  excluded from the pass rate, never counted as a fail.

Today there is one suite: [MCP tool selection](../../packages/openthrottle-mcp/src/evals/tool-selection/README.md).

## One on-demand Nx target per suite

Every suite exposes exactly one Nx target, named `eval-<suite>`, on the project that owns it:

```bash
pnpm nx run @openthrottle/openthrottle-mcp:eval-tool-selection -- --trials 3
```

The target is `cache: false`, runs a CLI through `nx:run-commands`, and passes everything after `--`
to that CLI. Its `metadata.description` says it spends tokens and never runs in CI. Add a suite by
adding a target that follows this convention; do not add a second entrypoint, a script in `scripts/`,
or a `check:local` hook.

## What CI runs, and what it never runs

**Live suites never run in CI, and never in `check:local`.** A live run calls a model, which spends
tokens or consumes a subscription, and the answer is non-deterministic. CI cost is bounded by keeping
the repository public and CI free
([ci-cost.md](../monorepo/ci-cost.md)); a paid, flaky job is out of scope.

CI runs only what is free and deterministic, through each package's ordinary `test` target:

- grader unit tests, including a suite's characterization test of its aggregation,
- the trajectory converter and the statistics,
- offline integrity checks on case data (for tool selection: every tool a case names exists on the live
  surface).

Run a live suite by hand when you change what it measures: reworded tool descriptions, a new prompt, a
new driver.

## Running a driver-backed suite across drivers

A suite whose system under test is an agent CLI takes `--driver` with a comma list:

```bash
pnpm nx run <project>:eval-<suite> -- --driver antigravity,claude,codex --trials 3
```

That produces **one `eval_run` per driver, run sequentially**, so reports compare driver against
driver on the same dataset. Per run:

- **Concurrency defaults to 1 per subscription account.** Raise it explicitly, and only for API-key
  auth.
- **The auth mode is recorded** on the run (`api_key` or `subscription`), resolved at preflight. A
  comparison between runs with different auth modes is flagged in the report.
- **A usage limit pauses the run, it does not fail it.** The trial gets `usage_limited`, gets no grades,
  and drops out of the pass rate. The run returns a cursor and resumes from the first unfinished trial.
- **Budgets are in tokens.** The run stops scheduling once finished trials reach the budget and reports
  `budget` as the stop reason. A USD cap is added only when every driver in the run is priceable.
- **Each attempt gets its own git worktree**, disposed after grading.

> **Subscription terms.** Some vendors' subscription terms may not cover automated bulk runs. Running a
> suite on a subscription-backed CLI is a risk you accept per suite; prefer API-key auth for anything
> large (ADR Decision 8).

No suite is driver-backed yet, so no `--driver` list exists to copy. The core supports it today:
`runEval` takes a `config.driverId`, and a suite CLI loops over the requested drivers with one
`runEval` call each.

## Why tool selection is `api`-only today

Tool selection asks which tool an agent reaches for on its first turn. It does that with one Messages
API request that offers the OpenThrottle tools and never executes any of them. Its CLI therefore takes
`--driver api` (the default) and **exits 2 for any CLI driver**.

A CLI driver with the real OpenThrottle MCP attached would run the tools it picks, so a case like
"create a plan titled X" would call `create_plan` against whatever server the MCP points at. CLI-driven
tool selection needs a **sandboxed MCP** first: a server that records the call and returns a canned
result, with no database behind it. Until that exists, comparing tool selection across CLIs is out of
scope.

## Baselines

A suite may keep per-model baselines (tool selection does: `baselines/<model>.json`). Compare a run
only with a baseline for the same model, and re-record the baseline (`--write-baseline`) when you
change the wording or the cases on purpose. The baseline diff is the review.
