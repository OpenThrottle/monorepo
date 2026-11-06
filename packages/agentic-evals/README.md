# @openthrottle/agentic-evals

The eval core for agent CLIs: case, dataset, trial and grader types; a runner that gives every
attempt its own git worktree; a judge-call cache; and the statistics that turn trials into
numbers worth trusting. Pure TypeScript, no NestJS and no database. Persistence and queue wiring
live elsewhere (see [the ADR](../../docs/openthrottle/eval-system-adr.md), Decisions 7 and 9).

## Installation

**pnpm:**

```bash
pnpm add @openthrottle/agentic-evals
```

**npm:**

```bash
npm install @openthrottle/agentic-evals
```

In this monorepo, depend on it with `workspace:^` and import from the main entry only.

## Running a suite

```ts
import {
  createGitWorktreeWorkspaceFactory,
  runEval,
} from '@openthrottle/agentic-evals';

const result = await runEval({
  config: {
    attempts: 3,
    authMode: 'subscription',
    budget: { maxTokens: 2_000_000 },
    concurrency: 1,
    driverId: 'claude',
    effort: undefined,
    model: 'opus',
  },
  dataset,
  graders: [forbiddenActionsGrader],
  workspace: createGitWorktreeWorkspaceFactory({ ref: 'main', repoPath }),
});
```

For each case and attempt the runner creates a workspace, runs the agent through
`withStructuredOutput(getDriver(driverId))` and `runDriverAsync`, builds the ATIF trajectory with
`buildTrajectoryRecord`, runs every grader against the live workspace, then disposes it.

- **Fail-soft.** A launch failure gives an `errored` trial; a crashing grader gives an `error`
  verdict. Neither stops the run.
- **Concurrency defaults to 1** (one subscription account). Raise it explicitly.
- **Budget.** `budget.maxTokens` stops scheduling once input plus output tokens of finished trials
  reach it (`stopReason: 'budget'`).
- **Usage limit.** A trial that hits a subscription limit is `usage_limited`: it gets no grades,
  `passRate` leaves it out, scheduling stops (`stopReason: 'usage_limit'`) and `cursor` names the
  next (case, attempt). Pass it back as `resumeFrom` to continue.
- **Injectable agent.** Pass `runIteration` to replace the driver call, for tests or a custom
  harness. `env` is merged over the child's environment.

> **Terms of service.** Some vendors' subscription terms may not cover automated bulk runs. That
> risk is yours to accept, per suite.

## Graders and the judge cache

A `Grader` is `{ id, version, kind: 'code' | 'judge' | 'human', grade(trial, case) }`. Bump
`version` whenever the check changes. Wrap judge calls with `createJudgeCache({ dir })`, keyed on
`sha256(prompt, input, graderVersion, judgeModel)`. Agent trials are never cached; their
randomness is what you are measuring.

## Statistics

Every function is pure and exported from `stats/`; each test cites where its expected value comes
from.

| Function                                    | What it gives you                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `passRate`                                  | pass fraction and `n`, leaving out `error` and `usage_limited`                           |
| `bootstrapCi`                               | seeded percentile bootstrap CI (10,000 resamples, 95%, same seed gives same interval)    |
| `pairedDifference`, `mcnemar`               | run B vs run A on the same cases: mean difference, paired CI, McNemar p, cases got worse |
| `passAtK`, `passHatK`                       | unbiased pass@k (Chen et al. 2021) and pass^k (tau-bench)                                |
| `cohensKappa`, `catchRate`, `falseFailRate` | judge-vs-human agreement for calibrating a judge question                                |
| `detectionFloor`, `requiredSampleSize`      | smallest detectable pass-rate change at a dataset size, and its inverse                  |
| `costPerSuccess`                            | total cost over passing trials; `null` when any trial is unpriced                        |

`detectionFloor` uses the normal approximation
`delta = (z(1 - alpha/2) + z(power)) * sqrt(2 p (1 - p) (1 - rho) / n)`; at `rho = 0` it is Lehr's
rule. Anything under the floor is noise at that `n`.

## Development

```bash
pnpm nx run @openthrottle/agentic-evals:lint
pnpm nx run @openthrottle/agentic-evals:typecheck
pnpm nx run @openthrottle/agentic-evals:test
pnpm nx run @openthrottle/agentic-evals:build
```

Live suites never run in CI; `test` covers only the pure logic, plus one end-to-end test that
points the real driver at a stub `codex` script.
