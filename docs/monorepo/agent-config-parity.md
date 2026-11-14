# Agent config parity: one source for MCP servers and permissions

Every agent CLI OpenThrottle drives (antigravity, claude, codex, cursor, grok, opencode) and VS Code should get the same MCP servers and the same permission policy out of the gate. Each tool has its own file format, so this repo keeps the policy in **one hand-authored file** and generates each tool's copy from it. A drift gate fails CI when a generated file is edited by hand. The pattern is the same as [ot-skill-sync](../../skills/ot-skill-sync/SKILL.md): one source, generated fan-out, a `--check` mode.

- **Source of truth:** [`.agents/agent-config.json`](../../.agents/agent-config.json)
- **Generator:** `pnpm exec tsx scripts/sync-agent-config.ts` (`--check` fails on drift)
- **What each tool can and cannot express:** [agent-editor-folders.md § Cross-agent parity](./agent-editor-folders.md#7-cross-agent-parity)
- **MCP registration, tokens, launchers:** [mcp-registration.md](../openthrottle/mcp-registration.md)

## Why a new file, not `.mcp.json`

`.mcp.json` is Claude Code's file. Making it the source would mean either putting fields Claude does not know (`defaultOn`, per-tool overrides) into a file Claude reads strictly, or keeping the permission policy somewhere else. `.agents/` already holds the tool-neutral agent assets (personas, prompts, hooks), so the neutral policy lives there and `.mcp.json` becomes an output like every other tool's file.

## Schema

The file has two top-level keys. Keys are alphabetized.

### `mcpServers`

A map from server name to a definition. Each definition is one of two shapes, chosen by `transport`:

| Field         | Shape   | Meaning                                                                                                                        |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `transport`   | both    | `"stdio"` or `"http"`. Picks the shape.                                                                                        |
| `command`     | `stdio` | Executable to spawn.                                                                                                           |
| `args`        | `stdio` | Argument list. Relative launcher paths (`./scripts/…`) resolve from the session's cwd in most tools; see the parity matrix.    |
| `url`         | `http`  | Streamable-HTTP endpoint.                                                                                                      |
| `defaultOn`   | both    | `true` = every tool starts it with no local setup. `false` = defined here, off by default, opted into locally.                 |
| `description` | both    | Why the server exists and its gotchas. Copied into tools whose schema carries a description (`.mcp.json`, `.cursor/mcp.json`). |

**Default-on set:** `fetch`, `github`, `maestro`, `openthrottle-mcp`, `shadcn`. **Defined but off:** `openthrottle-mcp-docker` (fails unless the Docker `prod` profile is running) and `nx-mcp` (the `nx-workspace` skill and Nx Console already cover it).

### `permissions`

Two ordered lists, `allow` and `deny`. Each entry is one rule:

| Field           | Meaning                                                                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shell`         | A glob over the **whole command line**. `*` matches any run of characters, spaces included (`git push*main*`). This is the syntax Claude Code, OpenCode and Grok all match natively.               |
| `mcpServer`     | Allow every tool of one MCP server (`openthrottle-mcp`).                                                                                                                                           |
| `codexPrefixes` | Optional, deny rules only. Codex matches argv **token prefixes**, not globs, so a glob with an inner `*` cannot be translated mechanically. List the exact token prefixes that rule should forbid. |

An entry has exactly one of `shell` or `mcpServer`. `allow` means "run without asking". `deny` means "refuse", and it wins over `allow` in every tool that has both.

**These rules are advisory, not a security boundary.** Every tool's matcher can be dodged by reshaping the command (`git -C . push`, `git -c x=y push`, `HEAD:main` refspecs, flag reordering). The `bash-guard` hooks (`.claude/hooks/`, `.cursor/hooks/`) and the Husky `pre-push` hook remain the real enforcement for pushes to `main` and force pushes.

## Generated outputs

| Tool        | File(s) written                                                                                | Ownership                                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| claude      | `.mcp.json`                                                                                    | Whole file                                                                                                               |
| claude      | `.claude/settings.json`                                                                        | Only `enabledMcpjsonServers` and `permissions.{allow,deny}`. Hooks, `attribution` and every other key are hand-authored. |
| cursor      | `.cursor/mcp.json`                                                                             | Whole file                                                                                                               |
| cursor      | `.cursor/cli.json`                                                                             | Whole file. It may hold **only** `permissions`: any other key makes every `cursor-agent` run fail schema validation.     |
| codex       | `.codex/config.toml`                                                                           | Whole file                                                                                                               |
| codex       | `.codex/rules/default.rules`                                                                   | Whole file                                                                                                               |
| opencode    | `opencode.json`                                                                                | Only the `mcp` block and `permission.bash`. `permission.skill` and every other key are hand-authored.                    |
| VS Code     | `.vscode/mcp.json`                                                                             | Whole file                                                                                                               |
| grok        | none                                                                                           | Grok reads `.mcp.json` and `.claude/settings.json` permissions natively, so it gets the policy through Claude's files.   |
| antigravity | `.agents/plugins/openthrottle/plugin.json`, `mcp_config.json`, `hooks.json`, `deny-rules.json` | Whole files. A workspace plugin: see [Antigravity: the workspace plugin](#antigravity-the-workspace-plugin).             |

Whole-file outputs are marked `linguist-generated` in [`.gitattributes`](../../.gitattributes). Partly generated files are not, because their hand-authored keys still need review.

## MCP mapping

| Neutral                    | claude / cursor (`mcpServers`)                          | VS Code (`servers`)                | opencode (`mcp`)                               | codex (`[mcp_servers.<n>]`)    |
| -------------------------- | ------------------------------------------------------- | ---------------------------------- | ---------------------------------------------- | ------------------------------ |
| `stdio` `command` + `args` | `command`, `args`                                       | `type: "stdio"`, `command`, `args` | `type: "local"`, `command: [command, ...args]` | `command`, `args`              |
| `http` `url`               | `type: "http"`, `url`                                   | `type: "http"`, `url`              | `type: "remote"`, `url`                        | `url`                          |
| `description`              | `description`                                           | dropped (no field)                 | dropped (no field)                             | dropped (TOML comment instead) |
| `defaultOn: true`          | listed; Claude also lists it in `enabledMcpjsonServers` | listed                             | `enabled: true`                                | `enabled = true`               |
| `defaultOn: false`         | **omitted**                                             | **omitted**                        | `enabled: false`                               | `enabled = false`              |

**The rule for off servers:** a tool gets an off server only when its own schema has an off switch that a session honours (OpenCode `enabled`, Codex `enabled`). Everywhere else the server is left out, because there is no committable way to keep it from starting. Claude Code `-p` loads every project server without asking, `cursor-agent --approve-mcps` (which the driver passes) approves all of them, and Grok starts everything in `.mcp.json` once the folder is trusted. To opt in to an off server, add it at user level: `claude mcp add --scope local`, `~/.cursor/mcp.json`, VS Code's user `mcp.json`, or flip `enabled` in your OpenCode or Codex config.

## Permission mapping

| Neutral rule               | claude (`permissions`) | cursor (`.cursor/cli.json`)          | opencode (`permission.bash`)           | codex (`.codex/rules/default.rules`)                                                    |
| -------------------------- | ---------------------- | ------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------- |
| `allow` `shell: "<glob>"`  | `Bash(<glob>)`         | `Shell(<first word>:<rest of glob>)` | `"<glob>": "allow"`                    | **not emitted** (see below)                                                             |
| `deny` `shell: "<glob>"`   | `Bash(<glob>)`         | `Shell(<first word>:<rest of glob>)` | `"<glob>": "deny"`, after every allow  | one `prefix_rule(…, decision="forbidden")` per `codexPrefixes` entry; none listed = gap |
| `allow` `mcpServer: "<n>"` | `mcp__<n>__*`          | `Mcp(<n>:*)`                         | not emitted (OpenCode has no MCP gate) | not emitted                                                                             |

Notes on the translations that are not 1:1:

- **Cursor** splits a shell rule at its first space: the first word is the command and the rest is a glob over its arguments. `git push*main*` becomes `Shell(git:push*main*)`. The args glob is matched against the whole remaining argument string, so the meaning is preserved.
- **OpenCode** uses "last matching rule wins", so the generator writes every allow before every deny.
- **Codex** matches token prefixes of argv. `git push*main*` cannot be expressed as a prefix, so each deny lists the concrete prefixes it should block in `codexPrefixes`. A deny with no `codexPrefixes` (today `git push*+*` and the bare `git push*--force`, whose prefixes are already covered by the `--force *` rule) is recorded as a Codex gap. Codex `allow` rules are not generated: Codex headless runs are governed by `--sandbox workspace-write` and `approval_policy`, and widening what Codex runs without approval is a separate decision from parity.
- **Antigravity** gets the deny globs verbatim in `deny-rules.json`; the plugin's `hooks.json` runs `scripts/antigravity-deny-hook.ts` on every `run_command`, which splits the line on `&&`, `||`, `;`, `|` and newlines and denies when any part matches. agy's own `command(...)` rules are not used: they are token prefixes with no `*` (see below), so they would drop `git push*--force` and `git push*+*`.
- **Grok** imports `.claude/settings.json` permission rules natively (verified with `grok inspect`), so Claude's output is Grok's output.

## Gaps: what a tool cannot express

| Tool        | Gap                                                                                                                                                                                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| antigravity | MCP servers arrive only through the generated workspace plugin; `agy mcp list` does not show them. Shell denies are enforced by a plugin PreToolUse hook, not agy's own rules; allows are not generated (headless runs pass `--dangerously-skip-permissions`). Interactive agy in this repo prompts for commands it would otherwise auto-run. |
| VS Code     | `chat.tools.terminal.autoApprove: false` makes a command prompt but cannot block it, and `.vscode/settings.json` is gitignored here. No permission policy is generated.                                                                                                                                                                       |
| codex       | Project config and rules load only for **trusted** projects (`[projects."<path>"] trust_level = "trusted"` in `~/.codex/config.toml`); see [Codex trust in worktrees](#codex-trust-in-worktrees). `prefix_rule` cannot express "anywhere in argv".                                                                                            |
| cursor      | MCP approval is user-level (`~/.cursor/projects/<slug>/mcp-approvals.json`) or `--approve-mcps`. Agent attribution (`attributeCommitsToAgent`) is user-level only, in `~/.cursor/cli-config.json`.                                                                                                                                            |
| grok        | Repo MCP servers and project permission rules apply only in a trusted folder (`--trust` or `~/.grok/trusted_folders.toml`). A user-level `~/.claude.json` entry shadows the repo's.                                                                                                                                                           |
| claude      | Interactive sessions honour `enabledMcpjsonServers` only after the folder is trusted.                                                                                                                                                                                                                                                         |

## Antigravity: the workspace plugin

`agy` (1.5.8) reads MCP servers from `~/.gemini/config/mcp_config.json` and from **plugins**, and `<workspace>/.agents/` is one of its customization roots. So the generator writes a plugin, `.agents/plugins/openthrottle/`, holding the default-on servers. Probed 2026-11-12 from an OT worktree:

- A live `agy -p` session loads it: it listed `openthrottle_fetch`, `openthrottle_github`, `openthrottle_maestro`, `openthrottle_openthrottle-mcp` and `openthrottle_shadcn`, and the OT MCP `health` call returned `ok` for api, database, redis and websocket. agy prefixes plugin servers with `<plugin>_`.
- `agy mcp list` and `agy plugin list` still print nothing. They only read user-level config, so use a live session to check.
- agy starts a plugin's stdio servers **with cwd = the plugin folder**, so the generator rewrites `./scripts/…` arguments to `../../../scripts/…`. The launchers resolve the repo from their own path.
- In headless `-p` without `--dangerously-skip-permissions`, MCP calls are denied until `permissions.allow` grants them (`mcp(*)` works; `mcp(openthrottle_openthrottle-mcp)` did not). The driver passes `--dangerously-skip-permissions`, so plan runs are not affected.

`--settings '<json or path>'` validates its keys: `mcpServers` is rejected (`unknown setting`), so it cannot carry MCP servers. `permissions` (`allow` / `deny` / `ask` arrays of rules such as `command(git status)` and `mcp(*)`) is accepted and enforced (the `mcp(*)` allow above).

### Shell denies: a plugin hook (OT plan `1e74c1eb`)

Probed 2026-11-13 on agy 1.5.8 from an OT worktree, every run with `--dangerously-skip-permissions` (the driver always passes it):

- A `--settings` `permissions.deny` rule **is** enforced under that flag: `command(git status)` denied `git status --short` ("Matches user-configured deny rule"); without it the command ran.
- Those rules match **token prefixes**, with no wildcard: `command(git log --oneline)` blocks `git log --oneline -1` and `cd . && git log --oneline -1`, but not `git log -1 --oneline`; `command(git log*-1*)` blocks nothing. Only the `codexPrefixes` could be translated.
- A plugin `hooks.json` PreToolUse handler that prints `{"decision":"deny","reason":…}` blocks the call ("tool call denied by pre-tool hook: …"). The workspace plugin loads it with no flag.

So the generator writes `hooks.json` (one `openthrottle-deny` hook on `run_command`) and `deny-rules.json` (the deny globs), and `scripts/antigravity-deny-hook.ts` decides. That keeps the full glob semantics, needs no driver or runner change, and covers interactive agy too. Hook contract details that shaped the script:

- stdin is JSON with `toolCall.args.CommandLine`; the hook's cwd is the plugin folder, hence `node --experimental-strip-types ../../../scripts/antigravity-deny-hook.ts`.
- **An empty `{}` and a crashing hook both deny.** The script always prints a decision, and fails closed with a reason if `deny-rules.json` is missing or malformed.
- A non-match answers `ask`, which defers to agy's normal policy: it runs under `--dangerously-skip-permissions` and honours `permissions.allow`. `allow` would auto-approve and bypass that policy. The cost: interactive agy (no skip flag) prompts for commands it would otherwise auto-run.

Verified live: `agy -p` asked to run `git push --dry-run origin main` (with a bogus `pushurl`, so nothing could leave) was denied with the hook's reason; `git status --short` ran. As with every tool, `bash -c '…'` or `git -C . push` gets past a rule; the Husky `pre-push` hook stays the real gate.

## Codex trust in worktrees

Codex (0.167.0) reads `.codex/config.toml` and `.codex/rules/default.rules` only in a trusted project, and it resolves a linked worktree to its **primary checkout** before checking trust. So one `~/.codex/config.toml` entry for the primary checkout path covers every OT worktree. An entry for a parent directory covers nothing, and `-c 'projects."<path>".trust_level="trusted"'` is ignored.

Worktree provisioning (`scripts/setup_worktree.ts`) and every heal (`scripts/heal_worktree.ts`) therefore make sure that one entry exists, via `scripts/utils/codex-trust.ts`. The rules it follows (owner-approved, OT plan `00beee78`):

- It only adds. It never rewrites the file, and it leaves an existing entry for the path alone, including one set to something other than `"trusted"`; it warns instead.
- It runs only when `codex` is on `PATH`. It honours `CODEX_HOME`.
- Teardown never removes the entry. The primary checkout outlives its worktrees, so there is nothing per-worktree to clean up.
- `OPENTHROTTLE_CODEX_TRUST=0` turns it off.

Check it from a worktree with `codex mcp list` (the default servers are listed `enabled`) and `codex execpolicy check --rules .codex/rules/default.rules git push origin main` (`"decision":"forbidden"`).
