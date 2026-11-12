# @openthrottle/openthrottle-agentic-loop

Pure, dependency-injected parent state machine for the OT Loop job: `runOtLoop` runs a plan one task at a time over an injected OT client, worker runner, validator, git, clock and cancel signal. Consumed by `openthrottle-server`. See `docs/workflows/ot-loop-job.md`.

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/openthrottle-agentic-loop
```

**npm:**

```bash
npm install @openthrottle/openthrottle-agentic-loop
```

## Configuring validation

`resolveOtLoopCommands` picks the commands the loop runs (docs/workflows/ot-loop-job.md § 6). Validation resolves in this order, first hit wins:

1. The plan's `otLoop.validationCommands`.
2. `validation.commands` in the repository's committed `.openthrottle/ot-loop.json`.
3. The Nx default when the worktree has an `nx.json`: `<pm> nx affected -t lint|typecheck|test --base={taskStartSha} --parallel=1`, where `<pm>` is `pnpm`, `npx` or `yarn` from the lockfile (`npx` with none).
4. Otherwise a `none` result ("needs a validation command"); validation is never skipped.

```json
{
  "validation": {
    "commands": ["pnpm nx affected -t lint --base={taskStartSha} --parallel=1"]
  },
  "setup": { "commands": ["pnpm nx run-many --target=codegen-graphql --all"] },
  "finalValidation": {
    "commands": ["pnpm nx run-many -t lint,typecheck,test --parallel=1"]
  }
}
```

Every section is optional. `setup` runs once per run before the first task and `finalValidation` before finalize; neither has an Nx default, and both are read from the file even when the plan overrides validation. `{taskStartSha}` is the only placeholder and is substituted shell-escaped. A malformed file resolves to an `invalid` result naming the problem; empty `validation.commands` is invalid.

`createCommandValidator` runs the commands through a shell in the worktree, strictly one at a time. The first non-zero exit (or a per-command timeout, default 30 minutes, exit code 124) is red with the command, exit code and `tailForRetry` output; an abort kills the child and ends `aborted`, never red. Output reaches `onChunk` as `{ command, taskId, text }`, batched by `createBatchedChunkSink` (4 KB or 2 s, flushed at the end of each command).
