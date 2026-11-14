<!-- GENERATED — DO NOT EDIT. Source: packages/agentic-hooks/scripts/bundle-hooks.ts -->

# OpenThrottle guards plugin (Cursor)

Checks every shell command the agent is about to run against a registry of mistakes that
fail in ways the agent cannot see: an unquoted zsh glob that aborts before the command runs,
a `$var:x` zsh modifier, a BSD `sed -i` with no suffix, a pipeline or trailing `echo $?` that
masks a failing exit status, and a `gh` write to a PR that is already merged or closed.

## Install

Pass the payload directory directly:

```bash
cursor-agent --plugin-dir /path/to/plugins/openthrottle-cursor-guards -p "…"
```

Installing once applies it in every repository you open — nothing is written into any of
them. OT-orchestrated runs load it with `--plugin-dir` whether or not you installed it.

## Can it block a tool call?

`bash-guard` **denies** a small set of commands that cannot succeed and warns, without
denying, on the rest. It allows whenever it fails.

## What it never does

- It never writes inside your repository. Any state it keeps lives under `~/.openthrottle/`.
- It never reads your repository's `.env` unless the checkout is OpenThrottle itself.
- It never fails because it crashed: every hook allows and exits 0 on an internal error.

## Turning it off

| how | effect |
| --- | --- |
| `cursor-agent plugin marketplace` | manage or remove the installed plugin |

## Hooks

| event | handler |
| --- | --- |
| `beforeShellExecution` | `hooks/bash-guard.cjs` |

## Authoring

This directory is generated from `@openthrottle/agentic-hooks`. Edit
`packages/agentic-hooks/`, then run:

```bash
pnpm nx run @openthrottle/agentic-hooks:bundle-hooks
```

## License

Apache-2.0, as part of the OpenThrottle monorepo. See `LICENSE.md` and `NOTICE` at the
repository root.
