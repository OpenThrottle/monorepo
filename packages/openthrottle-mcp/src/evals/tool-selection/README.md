# MCP tool-selection evals

Checks that an agent given the openthrottle-mcp surface reaches for the right tool, with the right key
arguments, on its first turn. It also checks that the agent reaches for **no** OT tool when none fits. The
byte-budget gate (`monorepo:check-model-facing-text`) tells you the injected text grew. This suite tells you
whether a wording change made agents pick wrongly.

Modelled on T3 Code's `evals/` (pingdotgg/t3code @ 88f61136): cases fail before their fix, control cases
are required, and results compare against a same-model baseline. CI runs only the grader.

The suite runs on the shared eval core, `@openthrottle/agentic-evals`, so there is one harness for every
eval. How suites run in general (the `eval-<suite>` target convention, running across drivers, what CI
does and does not run) is in
[docs/openthrottle/evals-running-suites.md](../../../../../docs/openthrottle/evals-running-suites.md).

## Run it (on demand, never in CI)

```bash
ANTHROPIC_API_KEY=… pnpm nx run @openthrottle/openthrottle-mcp:eval-tool-selection
pnpm nx run @openthrottle/openthrottle-mcp:eval-tool-selection -- --case follow-up,task-start --trials 3
pnpm nx run @openthrottle/openthrottle-mcp:eval-tool-selection -- --model claude-sonnet-5-5 --write-baseline
```

| Flag               | Default           | Meaning                                                       |
| ------------------ | ----------------- | ------------------------------------------------------------- |
| `--driver`         | `api`             | `api` only; any CLI driver exits 2 (see below)                |
| `--model`          | `claude-opus-5-5` | Model under test; also picks the baseline file                |
| `--effort`         | `medium`          | `output_config.effort`                                        |
| `--trials`         | `1`               | Attempts per case; a case's score is its pass rate            |
| `--case`           | all               | Comma list of case ids and/or areas                           |
| `--tolerance`      | `0`               | Allowed pass-rate drop before a case counts as regressed      |
| `--concurrency`    | `4`               | Requests in flight                                            |
| `--write-baseline` | off               | Record this run as `baselines/<model>.json` (full suite only) |

Every run spends tokens: one request per case per trial. The ~60 KB tool surface sits behind a
prompt-cache breakpoint, so after the first request most input tokens are cache reads. The run prints its
token totals, the overall pass rate with its bootstrap 95% CI, and the detection floor for the suite size
(errored trials are excluded from those core stats but count as failures against the baseline). Results land in `tmp/evals/tool-selection/<model>.json`. The exit code is 1 when any case
regressed against the baseline, 2 on a usage error, and 0 otherwise.

Running it in CI was rejected on cost ([docs/monorepo/ci-cost.md](../../../../../docs/monorepo/ci-cost.md)).
CI runs only what is free: the grader, baseline comparison, adapter, runner and case-integrity unit tests,
through the package's ordinary `test` target.

### Why `--driver` takes only `api`

`--driver claude`, `--driver codex,cursor` and the rest exit 2. A CLI driver with the real OpenThrottle
MCP attached would **execute** the tool it picks, so a case like `plan-create-basic` would call
`create_plan` on a live server. Driving CLIs needs a **sandboxed MCP** first: a server that records the
call and returns a canned result, with no database behind it. Until it exists, this suite measures the
Messages API only.

## How a trial works

`cli.ts` lists the live surface through `listToolSurface()`, the same path the byte-budget measurement uses,
with every toolset enabled (`all`, not the lean `core` default) so cases for opt-in tools stay covered.
It then runs the cases through the core's `runEval`: the cases are an `EvalDataset` (target
`mcp_tool_selection`, every case in the `test` split because the suite has no tuning loop), and the system
under test is a `RunEvalIteration` that sends one Messages API request per trial. The request carries every OT tool, four generic harness
tools (`bash`, `read_file`, `edit_file`, `write_file`), and the server instructions in the system prompt,
injected the way an MCP client injects them. `tool_choice` is `auto`. Nothing is executed and there is no
second turn: the first assistant turn is the selection, recorded as an ATIF trajectory with one agent step
whose `tool_calls` are the selected calls (usage rides in its metrics). The `tool-selection` `code` grader
reads that step and applies `gradeCase.ts`:

- A `call` case passes when **any** first-turn call names one of `expect.tools` and satisfies every
  matcher in `expect.args` (`equals`, case-insensitive `includes`, or `present`).
- A `no-call` (control) case passes when the turn calls no OT tool. Harness tools are fine.
- Any call to a tool in `forbid` fails the case. For example, `write_file` is forbidden when a plan should
  go to OT rather than into a Markdown file.

A refusal or transport error makes the trial `errored` in the core, which leaves it out of the core pass
rate. For baselines it is still a non-pass trial reported as `error: …`, separately from a wrong pick, so
baseline numbers mean what they always did.
There is deliberately no refusal fallback, because a fallback would answer with a different model and
contaminate the same-model comparison.

## Baselines are per model

`baselines/<model>.json` is a committed run. A run is compared only with the baseline for its own model.
Comparing across models would report model drift as a wording regression. Each run records
`surfaceSha256`, a hash of the tool surface it saw, so a baseline says which wording it measured.
Re-record the baseline (`--write-baseline`, then commit) when you intentionally change tool wording, or
when you add or remove cases. The baseline diff is the review.

## Adding a case

Cases live in [`data/data.cases.ts`](./data/data.cases.ts). Ids are stable keys, so never rename one;
delete it and add a new one instead.

1. **A fix case must fail before its fix.** When an agent picked the wrong tool, write the case first and
   run it against the current wording with `--case <id> --trials 3`. Confirm it fails, then change the tool
   description or instructions and confirm it passes. Mark it `origin: { kind: 'regression', fixedBy:
'<commit subject or PR>' }`. A case that never failed proves nothing about the fix. Initial coverage
   that passed as written is `origin: { kind: 'seed' }`.
2. **Keep the controls.** At least a sixth of the suite must be `no-call` cases, and
   `__tests__/case-integrity.test.ts` enforces this. Controls catch the opposite failure: wording so eager that
   agents call OT tools for ordinary coding requests.
3. **Give the prompt everything the call needs** (UUIDs, author, category). The eval is single-turn, so
   the model cannot fetch first and act second.
4. **Match key arguments only.** Assert the arguments that decide correctness (`status`, the id, the
   `follow-up` tag), not wording the model may paraphrase.

`__tests__/case-integrity.test.ts` checks the cases against the live surface offline. It fails when a case names a
tool or argument that no longer exists, which would otherwise leave a case that can never pass.

## Files

| File                                          | Role                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `eval-case.ts`                                | Case, selection and selector types                                                          |
| `data/data.cases.ts`                          | The cases                                                                                   |
| `data/data.dataset.ts`                        | Dataset target, grader id and version                                                       |
| `data/data.harness-tools.ts`                  | Generic harness tools offered next to OT                                                    |
| `tool-selection-core.ts`                      | Cases as a core `EvalDataset`, the iteration under test, and `gradeCase` as a `code` grader |
| `selection-trajectory.ts`                     | Selection to and from an ATIF trajectory, usage included                                    |
| `gradeCase.ts`                                | Pure grading rules (unit-tested, runs in CI)                                                |
| `runEvals.ts`                                 | `runEval` + aggregation back to baseline-shaped results and the core report                 |
| `__tests__/runEvals.characterization.test.ts` | Literal per-case results; proof the port kept baselines compatible                          |
| `compareBaseline.ts`                          | Same-model baseline comparison (format unchanged)                                           |
| `anthropic-tool-selector.ts`                  | Messages API adapter (`@anthropic-ai/sdk` `client.messages.create`)                         |
| `cli.ts`                                      | The Nx target's entry point                                                                 |

The evals are not reachable from `bin.ts` or `bin-http.ts`, so the production esbuild bundle does not
include them or the eval core. Keep it that way.
