<!-- GENERATED — DO NOT EDIT. Source: packages/agentic-hooks/scripts/bundle-hooks.ts -->

# OpenThrottle skill-usage plugin (Claude Code)

Records **which** agent skills run under Claude Code, so OpenThrottle can report skill usage.

This payload is per-tool because a hook config names its own tool's events. See
`packages/agentic-hooks/README.md` for the producer matrix.

## Install

```bash
/plugin marketplace add OpenThrottle/monorepo
/plugin install openthrottle@openthrottle
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

In your repository the privacy level is `name-only`: **skill arguments are not
collected at all** — the recorded `args` is null, not a truncated string. "It records
which skills ran, never what you typed" is the claim, and you can check it by reading
`src/utils/privacy.ts` in the OpenThrottle monorepo. A secret redactor runs on top of
that regardless, as a backstop rather than as the control.

The one exception is the OpenThrottle monorepo itself, where the operator owns the code
the arguments come from: there the level is `truncated` (redacted, capped at 256 chars).
Raising any other repository to that level takes an explicit opt-in in the operator's own
machine-global config. It is never inferred from your repository.

## What it never does

- **It never writes inside your repository — no file, on any code path, including
  error paths.** When it cannot reach a server it buffers to
  `~/.openthrottle/skill-usage/<hash>/` in the operator's home directory instead. This
  is tested rather than merely promised: a test runs a whole capture → persist → drain
  cycle against a dead endpoint and fails unless the checkout is byte-identical after.
- **It never reads your `.env`**, not even to find a server. The endpoint comes only
  from the environment the process was started with, or from the operator's own
  `~/.openthrottle/hooks.json`. A repository cannot redirect this telemetry.
- It never blocks or fails a tool call. Every hook is fail-open and exits 0.
- It never forwards your email address, even where the tool puts one in every payload.
- With no OpenThrottle server configured it sends nothing, silently.

See `docs/monorepo/child-repo-hook-telemetry-contract.md` for the full contract, which
also records the parts of it that are not implemented yet.

## Turning it off

| how | effect |
| --- | --- |
| `SKILL_USAGE_DISABLE_SERVER=1` | buffers locally, never sends |
| `/plugin uninstall openthrottle` | removes it entirely |

## Hooks

| event | handler |
| --- | --- |
| `PreToolUse` (matcher `Skill`) | `hooks/skill-usage-capture.cjs` |
| `UserPromptExpansion` | `hooks/skill-usage-capture.cjs` |
| `Stop` | `hooks/skill-usage-complete.cjs` |

The two capture events are complementary, not redundant: a skill invoked as a tool
raises `PreToolUse`, a skill invoked as a slash command raises `UserPromptExpansion`.

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
