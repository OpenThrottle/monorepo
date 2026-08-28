# Recurring agent jobs (`Job_*` prompts)

Eleven standalone audit prompts live in [`.agents/prompts/`](../../.agents/prompts/). Each one sweeps a single dimension — most sweep repository health, `Job_Issue_Reporting` sweeps the inbound GitHub issue queue — is **read-only on source code**, and has exactly one side effect: it files an OpenThrottle plan with prioritized, self-contained tasks. Nothing merges without a human starting that plan.

They are invoked two ways:

```bash
# Ad-hoc, straight through the Claude Code CLI
claude -p "$(cat .agents/prompts/Job_DeadCode.md)" --model sonnet
```

Note that `workflow-ralph --prompt-file` is **not** the ad-hoc path for these prompts: that CLI requires `--plan` or `--task` (a plan or task UUID) and exits non-zero without one. These jobs exist to _create_ the plan, so there is no UUID to hand it. `--prompt-file` is for overriding the layer-1 prompt of a run that is already scoped to an existing plan.

…or on a cron schedule, as an OpenThrottle **scheduled agent job** (`createScheduledAgentJob`; UI at `/settings` → scheduled jobs).

## The eleven jobs

| Job                                                                       | Sweeps                                                               | Cadence  | Cap             |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------- | --------------- |
| [`Job_WorkInFlight`](../../.agents/prompts/Job_WorkInFlight.md)           | Open PRs, unpushed branches, stale worktrees, stranded plans, ledger | daily    | 20              |
| [`Job_Issue_Reporting`](../../.agents/prompts/Job_Issue_Reporting.md)     | Open issues across the OpenThrottle org, triaged against OT          | daily    | 10/run, 25/week |
| [`Job_TestHealth`](../../.agents/prompts/Job_TestHealth.md)               | Coverage weighted by churn, flaky and slow suites                    | weekly   | 12              |
| [`Job_DeadCode`](../../.agents/prompts/Job_DeadCode.md)                   | Knip triage, unused/duplicate/misplaced dependencies                 | weekly   | 15              |
| [`Job_Security`](../../.agents/prompts/Job_Security.md)                   | Secrets, CVEs by reachability, auth/RBAC, injection surfaces         | weekly   | 10              |
| [`Job_DocDrift`](../../.agents/prompts/Job_DocDrift.md)                   | Documented commands and paths vs reality                             | weekly   | 15              |
| [`Job_RulesConformance`](../../.agents/prompts/Job_RulesConformance.md)   | House coding rules ESLint cannot catch, shape audits                 | weekly   | 15              |
| [`Job_Performance`](../../.agents/prompts/Job_Performance.md)             | Bundle growth, waterfalls, server hot paths, CI wall-clock           | weekly   | 10              |
| [`Job_DatabaseHealth`](../../.agents/prompts/Job_DatabaseHealth.md)       | Migrations, `COMMENT ON`, indexes, entity drift, N+1                 | biweekly | 12              |
| [`Job_ArchitectureDrift`](../../.agents/prompts/Job_ArchitectureDrift.md) | Nx tags, boundaries, deep imports, structural erosion                | biweekly | 12              |
| [`Job_Roadmap`](../../.agents/prompts/Job_Roadmap.md)                     | Monthly large-change and product-bet proposals                       | monthly  | 3               |

Every job states its own finding cap so an unattended run cannot file a 200-task plan, and every job dedupes against open OT plans before filing.

`Job_Issue_Reporting` is the one exception to "one run, one plan": its unit of work is the ISO week. The first daily run of a week opens `🔁 Issue reporting: week of <Monday>`; every later run that week appends tasks and one dated `append_plan_output` chunk to that same plan rather than opening a new one. Its cap is therefore two-sided — 10 new tasks per run, 25 on the week's plan in total.

## Schedule registry

Cron patterns are staggered so the weekly jobs never fire on the same day — a single morning of six audit plans is indistinguishable from noise. Times are UTC; set `timezone` on the schedule if a local wall-clock is preferred.

| Job                     | Cron            | Fires                   | Driver | Model    |
| ----------------------- | --------------- | ----------------------- | ------ | -------- |
| `Job_Issue_Reporting`   | `0 12 * * *`    | daily 12:00             | claude | `sonnet` |
| `Job_WorkInFlight`      | `0 13 * * *`    | daily 13:00             | claude | `sonnet` |
| `Job_TestHealth`        | `0 14 * * 1`    | Mondays 14:00           | claude | `sonnet` |
| `Job_DeadCode`          | `0 14 * * 2`    | Tuesdays 14:00          | claude | `sonnet` |
| `Job_Security`          | `0 14 * * 3`    | Wednesdays 14:00        | claude | `fable`  |
| `Job_DocDrift`          | `0 14 * * 4`    | Thursdays 14:00         | claude | `sonnet` |
| `Job_RulesConformance`  | `0 14 * * 5`    | Fridays 14:00           | claude | `sonnet` |
| `Job_Performance`       | `0 14 * * 6`    | Saturdays 14:00         | claude | `fable`  |
| `Job_DatabaseHealth`    | `0 15 1,15 * *` | 1st and 15th, 15:00     | claude | `fable`  |
| `Job_ArchitectureDrift` | `0 15 8,22 * *` | 8th and 22nd, 15:00     | claude | `fable`  |
| `Job_Roadmap`           | `0 16 1 * *`    | 1st of the month, 16:00 | claude | `fable`  |

`Job_Issue_Reporting` fires an hour ahead of `Job_WorkInFlight` so the day's inbound issues are already on a plan before the work-in-flight reconcile reads OT state. 12:00 UTC also sits well clear of the Monday 00:00 UTC ISO-week boundary, so a run can never straddle two week keys.

Cron has no native biweekly expression; the two biweekly jobs approximate it with day-of-month pairs, which drift by a day or two across month lengths. That is acceptable for a fortnightly audit — do not add a stateful scheduler to make it exact.

### Model assignment rationale

Model choice follows the tiering in [CLAUDE.md](../../CLAUDE.md):

- **Mechanical sweeps** — `WorkInFlight`, `TestHealth`, `DeadCode`, `DocDrift`, `RulesConformance`, `Issue_Reporting` — run on `sonnet`. Their findings come from tool output plus deterministic reading, so intelligence beyond that tier buys nothing and these are the most frequent runs.
- **Judgment-heavy sweeps** — `Security`, `Performance`, `DatabaseHealth`, `ArchitectureDrift`, `Roadmap` — run on `fable`. Each of these fails by being confidently wrong: a misjudged CVE reachability, an unmeasured perf claim, or a shallow roadmap proposal costs more than the model difference.

## Registering a schedule

Each job is one `createScheduledAgentJob` mutation. `prompt` carries the prompt file's contents — these prompts are deliberately self-contained, so a scheduled job needs nothing but the file's text:

```graphql
mutation {
  createScheduledAgentJob(
    input: {
      name: "Job_DeadCode"
      prompt: "<contents of .agents/prompts/Job_DeadCode.md>"
      driverId: "claude"
      model: "sonnet"
      cronPattern: "0 14 * * 2"
      timezone: "UTC"
      enabled: true
    }
  ) {
    id
    nextRunAt
  }
}
```

Register against a checkout where the job's commands actually resolve. Target it with `repositoryCheckoutId` (a registered repository checkout belonging to the caller); the `cwd` field is **deprecated** and is only consulted when no checkout is set, falling back to `WORKSPACE_ROOT`. Enable one job first (`Job_WorkInFlight` is the cheapest and the most immediately useful), confirm it files exactly one plan and edits nothing, then enable the rest.
