<!-- GENERATED — DO NOT EDIT. Source: packages/agentic-hooks/scripts/bundle-hooks.ts -->

# OpenThrottle skill-usage plugin (Cursor)

Records **which** agent skills run under Cursor, so OpenThrottle can report skill usage.

This payload is per-tool because a hook config names its own tool's events. See
`packages/agentic-hooks/README.md` for the producer matrix.

## Install

Pass the payload directory directly:

```bash
cursor-agent --plugin-dir /path/to/plugins/openthrottle-cursor -p "…"
```

Installing once applies it in every repository you open — nothing is written into any of
them. OT-orchestrated runs do not need this: the driver passes `--plugin-dir` at spawn time,
so an orchestrated run carries the same hooks whether or not you have installed anything.

The plugin version tracks `@openthrottle/agentic-hooks`, so a version bump there is what
users see.

## What it collects

Per skill invocation: the skill name, whether the skill is OpenThrottle-authored or
third-party, a timestamp, the session id, the git branch, and — on completion — an
outcome (`success` / `error` / `abandoned`) and a duration.

Outside the OpenThrottle monorepo the default privacy level is `name-only`: skill
**arguments are not collected at all**. A secret redactor runs regardless of level.

## What it never does

- It never writes inside your repository.
- It never blocks or fails a tool call. Every hook is fail-open and exits 0.
- It never reads your `.env`. Outside the OpenThrottle monorepo the endpoint comes
  only from the environment or from your own `~/.openthrottle/hooks.json`.
- It never forwards your email address, even where the tool puts one in every payload.
- With no OpenThrottle server configured it sends nothing, silently.

See `docs/monorepo/child-repo-hook-telemetry-contract.md` for the full contract.

## Turning it off

| how | effect |
| --- | --- |
| `SKILL_USAGE_DISABLE_SERVER=1` | buffers locally, never sends |
| `cursor-agent plugin marketplace` | manage or remove the installed plugin |

## Hooks

| event | handler |
| --- | --- |
| `preToolUse` | `hooks/skill-usage-capture.cjs` |
| `beforeSubmitPrompt` | `hooks/skill-usage-capture.cjs` |
| `sessionEnd` | `hooks/skill-usage-complete.cjs` |

Cursor has no `Skill` tool: a skill invocation is a `Read` of the skill's `SKILL.md`,
which is why capture listens on `preToolUse`. Completion listens on `sessionEnd`, not
`stop` — `stop` is the per-turn event and does not fire in headless runs at all.

## Authoring

This directory is generated from `@openthrottle/agentic-hooks` and drift-checked in
CI. Edit `packages/agentic-hooks/`, then run:

```bash
pnpm nx run @openthrottle/agentic-hooks:bundle-hooks
```

The plugin format also carries skills and MCP servers, so folding in OT skill injection
later is an addition to this payload rather than a rewrite. v1 is hooks only.

## License

Apache-2.0, as part of the OpenThrottle monorepo. See `LICENSE.md` and `NOTICE` at the
repository root.
