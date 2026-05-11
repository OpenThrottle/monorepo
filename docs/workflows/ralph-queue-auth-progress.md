# Ralph queue auth and session progress

**Purpose:** Single living log when debugging OpenThrottle Developer UI → BullMQ → spawned `workflow-ralph` / Claude auth spans multiple OpenThrottle (OT) plans. Update a row after each meaningful test or code change.

**Related OT plans**

| Plan ID                                | Title                                                                      | Status      |
| -------------------------------------- | -------------------------------------------------------------------------- | ----------- |
| `7aafef66-8b91-42be-9d5a-20465df32261` | Debug Ralph workflow: Claude Code prompts /login despite existing session  | Completed   |
| `002f6dd9-c013-4348-8cf3-b49b1ab80641` | BullMQ Ralph from Dev UI: durable progress doc + session for child process | In progress |

## How to use

1. Before a test run, add a new row (or duplicate the last row and edit) with today’s date and the OT plan id you are executing under.
2. Note **entrypoint**: `Dev UI`, `CLI (pnpm exec workflow-ralph)`, `Docker worker`, etc.
3. Capture **symptom** in one line (e.g. `/login` in terminal, missing `ANTHROPIC_API_KEY`, wrong `HOME`).
4. When you learn something concrete, fill **finding** and optional **PR / commit**.
5. At plan wrap-up, point the plan `summary` field at this file and the last row.

## Progress log

| Date (UTC) | OT plan id                             | Entrypoint                         | Symptom                                                                 | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | PR / commit |
| ---------- | -------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 2026-05-11 | `7aafef66-8b91-42be-9d5a-20465df32261` | Queue / processor investigation    | Claude or flow surfaces `/login` under queue-driven Ralph               | Prior plan: compared interactive vs worker HOME, env propagation, spawn wiring; see plan tasks for details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | —           |
| 2026-05-11 | `002f6dd9-c013-4348-8cf3-b49b1ab80641` | Dev UI → BullMQ → `PlansProcessor` | Claude path: “Not logged in · Please run /login”; nested child exit `1` | **Reproduced (captured logs, plan `8d943945-d185-4a0c-b80c-9689263e0cec`, job `17`):** `[workflow-ralph:debug]` shows `backend: 'claude'`, `runnerLabel: 'claude-code'`, `nonInteractive: true`, one stdout chunk (`stdoutLen: 34`), `exitCode: 1`. Parsed agent text length `33` then server logs Claude message **“Not logged in · Please run /login”** — this is **Claude Code CLI** session/OAuth, **not** OpenThrottle Developer `/login` and **not** a missing `ANTHROPIC_API_KEY` string in these lines. **Spawn (legacy no-worktree):** `pnpm exec workflow-ralph --plan <planId>` + argv from `buildWorkflowRalphRunTuningArgv` / `mergeRalphNestedRunTuningWithExecutionBackend`; **`cwd`** = `job.data.workingDirectory ?? WORKSPACE_ROOT ?? process.cwd()`; **`env`** = `buildWorkflowRalphSpawnEnv(process.env, { canonicalCortexPostgresUrl })` (overrides Postgres URL only; otherwise child inherits **worker** `HOME`, `PATH`, etc.). Worktree path uses the same env helper from `runChildJob` (`tools/workflows/src/utils/child-job.ts`). | —           |

## Quick verification checklist (queue path)

Use this when you believe auth is fixed; adjust commands to match your local compose and env.

- [ ] Worker logs show expected `HOME` and cwd for the child job.
- [ ] Required secrets or Claude config paths are present inside the worker (or explicitly documented as host-only with a workaround).
- [ ] Enqueue from **OpenThrottle Developer UI** completes a short plan iteration without an unexpected `/login` or auth redirect loop.
- [ ] Same machine: `pnpm exec workflow-ralph --plan <uuid>` still succeeds (regression check).

## References (code)

- `applications/openthrottle-server/src/queues/plans/plans.processor.ts` (log context `PlansProcessor`; spawn + `buildWorkflowRalphSpawnEnv`)
- `applications/openthrottle-server/src/queues/workflow/workflow.processor.ts` (`WorkflowProcessor`; same spawn pattern when used)
- `packages/nestjs-worktrees/src/utils/child-job.ts` (and app-local copies under `tools/workflows` if applicable)
- `tools/workflows/README.md`

## Error Logs (run summary)

```
--------------------------------------------------------------------------------

🤖  Running iteration 3
{"0":"PlansProcessor [planId=8d943945-d185-4a0c-b80c-9689263e0cec, jobId=17]","service":"openthrottle-server","times
:"2026-05-11T06:41:59.149Z"}

[LoggerService] 83145 warn: [workflow-ralph:debug] main: invoking iteration runner {
  agentPromptLen: 1123,
  backend: 'claude',
  iteration: 3,
  nonInteractive: true,
  timeoutMs: null
}
[workflow-ralph:debug] runIterationAsync: spawning runner { iteration: 3, runnerLabel: 'claude-code', timeoutMs
{"0":"PlansProcessor [planId=8d943945-d185-4a0c-b80c-9689263e0cec, jobId=17]","service":"openthrottle-server","timestamp"
:"2026-05-11T06:41:59.149Z"}

[LoggerService] 83145 info: child.env (redacted) ASYNC postgresql://***@localhost:***/***
{"0":"PlansProcessor [planId=8d943945-d185-4a0c-b80c-9689263e0cec, jobId=17]","service":"openthrottle-server","timestamp"
:"2026-05-11T06:41:59.150Z"}

[LoggerService] 83145 warn: [workflow-ralph:debug] runIterationAsync: child closed (normal) {
  chunkCount: 1,
  exitCode: 1,
  iteration: 3,
  resultLen: 33,
  runnerLabel: 'claude-code',
  stderrLen: 0,
  stdoutLen: 34
}
{"0":"PlansProcessor [planId=8d943945-d185-4a0c-b80c-9689263e0cec, jobId=17]","service":"openthrottle-server","timestamp"
:"2026-05-11T06:41:59.867Z"}

[LoggerService] 83145 warn: [workflow-ralph:debug] main: iteration runner finished (buffer ready for parse) { iteration:
3, resultLen: 33 }
[workflow-ralph:debug] parseRalphCompleteTaskSignals {
  hasCompleteTaskClose: false,
  hasCompleteTaskOpen: false,
  hasPromiseComplete: false,
  hasPromiseError: false,
  hasPromiseInputRequired: false,
  matchesRaw: 0,
  regexExecCount: 0,
  resultLen: 33,
  uniqueTaskIds: 0
}
⚠️  No <ralph:task-complete> signal in agent output. Task 360376f5-547a-46be-af3d-56c3b4e17fd4 was set to IN_PROGRESS; the agent must output <ralph:task-complete>…</ralph:task-complete> when done so the CLI can mark it completed.
[workflow-ralph:debug] parseRalphResponse: after output {
  hasCompleteTaskClose: false,
  hasCompleteTaskOpen: false,
  hasPromiseComplete: false,
  hasPromiseError: false,
  hasPromiseInputRequired: false,
  hasErr: false,
  hasInputRequired: false,
  isComplete: false,
  iteration: 3,
  parseOutcome: 'continue_next_iteration',
  plan: '8d943945-d185-4a0c-b80c-9689263e0cec',
  resultLen: 33
}
[workflow-ralph:debug] parseRalphResponse: continue (no terminal promise marker) {
  iteration: 3,
  stillExpected: 'one of <promise>ERROR</promise>, INPUT_REQUIRED, COMPLETE, or next iteration'
}
{"0":"PlansProcessor [planId=8d943945-d185-4a0c-b80c-9689263e0cec, jobId=17]","service":"openthrottle-server","timestamp"
:"2026-05-11T06:41:59.867Z"}

[LoggerService] 83145 info: Not logged in · Please run /login
{"0":"PlansProcessor [planId=8d943945-d185-4a0c-b80c-9689263e0cec, jobId=17]","service":"openthrottle-server","timestamp"
:"2026-05-11T06:41:59.868Z"}

[LoggerService] 83145 info:  - 📋 Max iterations reached; task 360376f5-547a-46be-af3d-56c3b4e17fd4 was reset to PENDING
so a future run can resume it.

--------------------------------------------------------------------------------


⚠️ All iterations have completed. Exiting...

--------------------------------------------------------------------------------
{"0":"PlansProcessor [planId=8d943945-d185-4a0c-b80c-9689263e0cec, jobId=17]","service":"openthrottle-server","timestamp"
:"2026-05-11T06:41:59.887Z"}

____ 5 👀 👀 👀 👀  { cancelled: false, exitCode: 0 }
[LoggerService] 83145 info: Ralph exited: exitCode=0, jobId=17, planId=8d943945-d185-4a0c-b80c-9689263e0cec, severity=suc
cess
```
