<!-- GENERATED — DO NOT EDIT. Source: packages/agentic-hooks/scripts/bundle-hooks.ts -->

# OpenThrottle skill-usage plugin (Codex)

Records **which** agent skills run under Codex, so OpenThrottle can report skill usage.

This payload is per-tool because a hook config names its own tool's events. See
`packages/agentic-hooks/README.md` for the producer matrix.

## Install

Add these to `~/.codex/config.toml` once, with the absolute path of this directory:

```toml
[[hooks.UserPromptSubmit]]
[[hooks.UserPromptSubmit.hooks]]
type = "command"
command = "/absolute/path/to/plugins/openthrottle-codex/hooks/skill-usage-capture.cjs"

[[hooks.SessionEnd]]
[[hooks.SessionEnd.hooks]]
type = "command"
command = "/absolute/path/to/plugins/openthrottle-codex/hooks/skill-usage-complete.cjs"

[[hooks.SessionStart]]
[[hooks.SessionStart.hooks]]
type = "command"
command = "/absolute/path/to/plugins/openthrottle-codex/hooks/skill-usage-heartbeat.cjs"
```

Installing once applies it in every repository you open — nothing is written into any of
them. Where the CLI has a `--plugin-dir` flag (Claude Code, Cursor), OT-orchestrated runs
pass it at spawn time and do not need this install.

The payload published to the `plugins-dist` branch carries no `version`, so every publish is
an update for installed copies.

## What it collects

Per skill invocation: the skill name, whether the skill is OpenThrottle-authored or
third-party, a timestamp, the session id, the git branch, the normalized git remote of
the repository (credentials stripped; nothing when there is no remote), and — on
completion — an outcome (`success` / `error` / `abandoned`) and a duration.

Outside the OpenThrottle monorepo the default privacy level is `name-only`: skill
**arguments are not collected at all**. A secret redactor runs regardless of level.
You can opt a specific repository in to `truncated` (redacted, 256 characters) by listing
its remote in `OPENTHROTTLE_TELEMETRY_TRUNCATED_REPOS` in `~/.openthrottle/.env`; the
repository itself and your shell environment cannot set it.
No filesystem path is sent from your repository either: the working directory is
reported only inside an OpenThrottle checkout, and the git remote identifies the
repository everywhere else.

## Configuring the endpoint

Values are resolved by WHERE they live, under one set of names. Highest first:

| location | when it is read |
| --- | --- |
| `<repo>/.env` | only in an OpenThrottle checkout — never in your repository |
| the process environment | always |
| `~/.openthrottle/.env` | always — this is the one to use |

So to record from your own repository, put this in `~/.openthrottle/.env` and
nothing anywhere else:

```sh
OPENTHROTTLE_GRAPHQL_URL=https://your-openthrottle-server/graphql
OPENTHROTTLE_MCP_AUTH_TOKEN=…
```

With no endpoint resolvable the hooks buffer to `~/.openthrottle/skill-usage/`
and send nothing. Records are kept, not dropped — configure the endpoint later
and the drain hook forwards them.

## What it never does

- It never writes inside your repository. Buffered telemetry goes to
  `~/.openthrottle/skill-usage/`, never to a `.cache/` directory in your tree.
- It never blocks or fails a tool call. Every hook is fail-open and exits 0.
- It never reads your repository's `.env`. That layer is gated on the checkout
  being OpenThrottle itself, and even there only `OPENTHROTTLE_*` keys are read.
- It never forwards your email address, even where the tool puts one in every payload.
- With no OpenThrottle server configured it sends nothing, silently.

See `docs/monorepo/child-repo-hook-telemetry-contract.md` for the full contract.

## Turning it off

| how | effect |
| --- | --- |
| `OPENTHROTTLE_TELEMETRY_OFFLINE=1` | buffers locally, never sends |
| remove the `[[hooks.…]]` blocks | stops it entirely |

## Hooks

| event | handler |
| --- | --- |
| `UserPromptSubmit` | `hooks/skill-usage-capture.cjs` |
| `SessionStart` | `hooks/skill-usage-heartbeat.cjs` |
| `SessionEnd` | `hooks/skill-usage-complete.cjs` |

Codex reads hooks from `~/.codex/config.toml` (or a trusted project's `.codex/`), never
from a plugin directory, so this payload ships no `hooks/hooks.json` and no driver passes
it as `--plugin-dir`. Capture is slash-commands-only: Codex raises no tool event for a skill.

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
