# @openthrottle/nestjs-worktrees

NestJS module for worktree-based workflows (acquire target → run loop → ensure commit → release). Re-exports workflow types and functions from `@tools/workflows` and provides a shared `WorktreeTargetsTracker` from the `WORKTREE_TARGETS` env var so BullMQ processors (or other consumers) can use the worktree workflow without depending on `@tools/workflows` directly.

## Installation

```bash
pnpm add @openthrottle/nestjs-worktrees
```

## Usage

1. Import `NestjsWorktreesModule` in your app (e.g. in the module that registers your queue processors). The module is `@Global()`, so the tracker is available everywhere once imported.

2. Inject the tracker with `@Inject(WORKTREE_TRACKER_TOKEN)` and use `runWorktreeWorkflow` / `runChildJob` from this package.

3. Set `WORKTREE_TARGETS` to a JSON array of `[id, path]` tuples or `{ id, path }` objects. If unset or empty, the tracker has no targets (processors can fall back to in-process behavior).

Example: see `applications/openthrottle-server` plans queue and `docs/workflows/bullmq-processor-worktree.md`.
