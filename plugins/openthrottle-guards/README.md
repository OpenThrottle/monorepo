<!-- GENERATED — DO NOT EDIT. Source: packages/agentic-hooks/scripts/bundle-hooks.ts -->

# OpenThrottle guards plugin (Claude Code)

Checks every shell command the agent is about to run against a registry of mistakes that
fail in ways the agent cannot see: an unquoted zsh glob that aborts before the command runs,
a `$var:x` zsh modifier, a BSD `sed -i` with no suffix, a pipeline or trailing `echo $?` that
masks a failing exit status, and a `gh` write to a PR that is already merged or closed.

After any write, `memory-index-guard` names the `MEMORY.md` entries that would fall past
the session index's size cap — the harness truncates silently, so the newest memories are
the ones lost.

## Install

```bash
/plugin marketplace add OpenThrottle/monorepo
/plugin install openthrottle-guards@openthrottle
```

Installing once applies it in every repository you open — nothing is written into any of
them. OT-orchestrated runs load it with `--plugin-dir` whether or not you installed it.

## Can it block a tool call?

`bash-guard` **denies** a small set of commands that cannot succeed (for example a `gh`
write to a merged PR) and warns, without denying, on the rest. `memory-index-guard` only
adds context. Both allow whenever they fail.

## What it never does

- It never writes inside your repository. Any state it keeps lives under `~/.openthrottle/`.
- It never reads your repository's `.env` unless the checkout is OpenThrottle itself.
- It never fails because it crashed: every hook allows and exits 0 on an internal error.

## Turning it off

| how | effect |
| --- | --- |
| `/plugin uninstall openthrottle-guards` | removes it entirely |

## Hooks

| event | handler |
| --- | --- |
| `PreToolUse` (matcher `Bash`) | `hooks/bash-guard.cjs` |
| `PostToolUse` (matcher `Write|Edit|MultiEdit`) | `hooks/memory-index-guard.cjs` |

## Authoring

This directory is generated from `@openthrottle/agentic-hooks`. Edit
`packages/agentic-hooks/`, then run:

```bash
pnpm nx run @openthrottle/agentic-hooks:bundle-hooks
```

## License

Apache-2.0, as part of the OpenThrottle monorepo. See `LICENSE.md` and `NOTICE` at the
repository root.
