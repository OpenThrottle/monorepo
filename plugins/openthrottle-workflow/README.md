<!-- GENERATED — DO NOT EDIT. Source: packages/agentic-hooks/scripts/bundle-hooks.ts -->

# OpenThrottle workflow plugin (Claude Code)

Keeps an agent working an OpenThrottle plan honest about its bookkeeping. During a plan
run it claims the plan inbox before a subagent delegation or a destructive command, so a
human's STEER lands before the step rather than after it; it warns when an edit is about
to happen with no task `IN_PROGRESS`; it tells the agent when completing a task closed the
plan; and on `Stop` it settles plan runs whose session is provably gone.

Outside a plan run, and with no OpenThrottle server configured, every hook is a no-op.
Plan-run notes live under `~/.openthrottle/`, never in your repository.

## Install

```bash
/plugin marketplace add OpenThrottle/monorepo
/plugin install openthrottle-workflow@openthrottle
```

It depends on `openthrottle` (telemetry), which installs with it.

Installing once applies it in every repository you open — nothing is written into any of
them. OT-orchestrated runs load it with `--plugin-dir` whether or not you installed it.

## Can it block a tool call?

`require-ot-plan-kickoff` **denies** a desktop-app session kickoff (`start_session`,
`hand_off_to_session`) whose brief does not start with `/ot-loop <planUuid>`, so
follow-up work lands in an OpenThrottle plan. Every other hook only adds context or
settles bookkeeping, and every one of them allows when it fails or cannot reach OT.

## What it never does

- It never writes inside your repository. Any state it keeps lives under `~/.openthrottle/`.
- It never reads your repository's `.env` unless the checkout is OpenThrottle itself.
- It never fails because it crashed: every hook allows and exits 0 on an internal error.

## Turning it off

| how | effect |
| --- | --- |
| `/plugin uninstall openthrottle-workflow` | removes it entirely |

## Hooks

| event | handler |
| --- | --- |
| `PreToolUse` (matcher `Bash|Agent|Task`) | `hooks/plan-inbox-claim.cjs` |
| `PreToolUse` (matcher `Edit|Write|MultiEdit|NotebookEdit`) | `hooks/plan-run-task-guard.cjs` |
| `PreToolUse` (session kickoff tools) | `hooks/require-ot-plan-kickoff.cjs` |
| `PostToolUse` (matcher `mcp__.*__update_task`) | `hooks/plan-auto-close.cjs` |
| `Stop` | `hooks/plan-run-janitor.cjs` |

## Authoring

This directory is generated from `@openthrottle/agentic-hooks`. Edit
`packages/agentic-hooks/`, then run:

```bash
pnpm nx run @openthrottle/agentic-hooks:bundle-hooks
```

## License

Apache-2.0, as part of the OpenThrottle monorepo. See `LICENSE.md` and `NOTICE` at the
repository root.
