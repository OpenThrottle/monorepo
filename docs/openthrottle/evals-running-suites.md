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

Tool selection is the first driver-backed suite (`--driver claude,codex`); see the next section.

## Tool selection through agent CLIs, against a sandboxed MCP

Tool selection asks which tool an agent reaches for. `--driver api` (the default) answers that with one
Messages API request that offers the OpenThrottle tools and executes none of them. `--driver claude,codex`
answers it the way each harness actually injects MCP tools: the real CLI runs the case, with a
**sandboxed MCP** attached in place of the real server.

```bash
pnpm nx run @openthrottle/openthrottle-mcp:eval-tool-selection -- --driver claude,codex --case plan-create-basic,task-start,control-git-log
```

The sandbox ([`src/evals/sandbox/`](../../packages/openthrottle-mcp/src/evals/sandbox/)) serves the identical
surface: the same instructions, names, descriptions and input schemas, every toolset. It records each
call and answers with a canned success, and nothing behind it touches GraphQL. A CLI with the real
server attached would **execute** `create_plan` or `delete_task`, which is why the sandbox has to
**replace** that server rather than sit beside it:

| Driver                                      | How the sandbox is attached                                                                                                                                                                                                                                                            |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claude`                                    | `--strict-mcp-config --mcp-config <sandbox>`: every other MCP source (user, project, local) is ignored                                                                                                                                                                                 |
| `codex`                                     | `-c mcp_servers.openthrottle-mcp.*` overrides replace a same-named user-scope server; the cwd is an untrusted temp dir, so no project config loads. They also set `default_tools_approval_mode = "approve"`, without which `codex exec` (approval policy `never`) fails every MCP call |
| `cursor`, `grok`, `opencode`, `antigravity` | **Refused** (exit 2): none has a way to provably shadow a host-configured OpenThrottle server                                                                                                                                                                                          |

Each is injected through a wrapper installed at the driver's binary env var (`OPENTHROTTLE_CLAUDE_BIN`,
`OPENTHROTTLE_CODEX_BIN`), so the driver packages stay workspace-agnostic.

The first OpenThrottle call is read from the trial's ATIF trajectory and **cross-checked against the
sandbox call log**, and the arguments come from the log, since that is what the server received. If the
trajectory shows an OpenThrottle call on a server other than the sandbox, that server answered it. That
is a **leak**: the trial errors, no later trial launches, and the CLI exits 3. Fix that CLI's MCP
configuration before running it again. A call to the sandbox's own name that never reached its log
failed in transit (an approval gate, a startup failure). That makes the trial errored, not a leak.

What a CLI run records differs from an `api` run:

- **Sequential, concurrency 1.** `--concurrency` applies to `api` only.
- **Each trial runs in an empty temp directory**, not a git worktree, so no repo `.mcp.json` or trusted
  project config is in reach.
- **The auth mode is recorded** from `--auth-mode` (`subscription` by default, or `api_key`).
- **The model is `<driver>/<model>`**, or `<driver>/cli-default` without `--model`. So the result file
  and baseline are `<driver>-<model>.json`, and a CLI baseline is never compared with another driver's
  or with the `api` one.
- **Harness tool names are the CLI's own** (`Write`, `Bash`), not the `api` run's generic `write_file`.
  A `forbid` entry naming a generic harness tool therefore only bites in `api` runs.

## Baselines

A suite may keep per-model baselines (tool selection does: `baselines/<model>.json`, and
`baselines/<driver>-<model>.json` for a CLI run). Compare a run only with a baseline for the same driver
and model, and re-record the baseline (`--write-baseline`) when you
change the wording or the cases on purpose. The baseline diff is the review.
