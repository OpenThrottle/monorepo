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
third-party, a timestamp, the session id, the git branch, the normalized git remote of
the repository (credentials stripped; nothing when there is no remote), and — on
completion — an outcome (`success` / `error` / `abandoned`) and a duration.

Outside the OpenThrottle monorepo the default privacy level is `name-only`: skill
**arguments are not collected at all**. A secret redactor runs regardless of level.
No filesystem path is sent from your repository either: the working directory is
reported only inside an OpenThrottle checkout, and the git remote identifies the
repository everywhere else.

Once per session start, a coverage heartbeat: a random machine id (generated once into
`~/.openthrottle/machine-id`, never derived from your hostname), an optional machine label
you set yourself with `OPENTHROTTLE_MACHINE_LABEL`, which way the hooks were delivered
(`repo`, `plugin-dir` or `marketplace`), the normalized git remote of the repository
(credentials stripped, no paths), this plugin's version, whether the marketplace plugin is
installed, and counts of locally buffered records with the age of the oldest. It carries no
email, hostname, username, path, token, skill name or argument. A heartbeat is never
buffered; the last attempt is written to `~/.openthrottle/skill-usage/last-heartbeat.json`.

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
| `/plugin uninstall openthrottle` | removes it entirely |

## Diagnosing

If skill usage is not showing up, run the doctor. It checks the plugin install, the
endpoint and token, server reachability, the local buffer, the last heartbeat and the
offline switch, then prints the exact fix for anything wrong. It is read-only unless you
pass `--fix`, and never prints your token.

```bash
# from an OpenThrottle checkout
pnpm run telemetry:doctor

# from anywhere, using the installed plugin
node ~/.claude/plugins/cache/openthrottle/openthrottle/<version>/hooks/skill-usage-doctor.cjs
```

Add `--json` for machine-readable output, or `--strict` to exit 1 when any check fails.

Add `--fix` to have it offer to install or update the plugin for you: it shows the exact
`claude plugin …` commands and runs them only after you answer yes. It needs an interactive
terminal and is ignored with `--json`.

## Hooks

| event | handler |
| --- | --- |
| `PreToolUse` (matcher `Skill`) | `hooks/skill-usage-capture.cjs` |
| `UserPromptExpansion` | `hooks/skill-usage-capture.cjs` |
| `SessionStart` | `hooks/skill-usage-heartbeat.cjs` |
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
