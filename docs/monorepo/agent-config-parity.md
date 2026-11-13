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

| Tool        | File(s) written              | Ownership                                                                                                                |
| ----------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| claude      | `.mcp.json`                  | Whole file                                                                                                               |
| claude      | `.claude/settings.json`      | Only `enabledMcpjsonServers` and `permissions.{allow,deny}`. Hooks, `attribution` and every other key are hand-authored. |
| cursor      | `.cursor/mcp.json`           | Whole file                                                                                                               |
| cursor      | `.cursor/cli.json`           | Whole file. It may hold **only** `permissions`: any other key makes every `cursor-agent` run fail schema validation.     |
| codex       | `.codex/config.toml`         | Whole file                                                                                                               |
| codex       | `.codex/rules/default.rules` | Whole file                                                                                                               |
| opencode    | `opencode.json`              | Only the `mcp` block and `permission.bash`. `permission.skill` and every other key are hand-authored.                    |
| VS Code     | `.vscode/mcp.json`           | Whole file                                                                                                               |
| grok        | none                         | Grok reads `.mcp.json` and `.claude/settings.json` permissions natively, so it gets the policy through Claude's files.   |
| antigravity | none                         | No project-level MCP or permission file exists. See the gaps below.                                                      |

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
- **Grok** imports `.claude/settings.json` permission rules natively (verified with `grok inspect`), so Claude's output is Grok's output.

## Gaps: what a tool cannot express

| Tool        | Gap                                                                                                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| antigravity | MCP servers and permission rules are user-level only (`~/.gemini/config/mcp_config.json`, `~/.gemini/antigravity-cli/settings.json`). No committed file can give a run the default set.            |
| VS Code     | `chat.tools.terminal.autoApprove: false` makes a command prompt but cannot block it, and `.vscode/settings.json` is gitignored here. No permission policy is generated.                            |
| codex       | Project config and rules load only for **trusted** projects (`[projects."<path>"] trust_level = "trusted"` in `~/.codex/config.toml`). `prefix_rule` cannot express "anywhere in argv".            |
| cursor      | MCP approval is user-level (`~/.cursor/projects/<slug>/mcp-approvals.json`) or `--approve-mcps`. Agent attribution (`attributeCommitsToAgent`) is user-level only, in `~/.cursor/cli-config.json`. |
| grok        | Repo MCP servers and project permission rules apply only in a trusted folder (`--trust` or `~/.grok/trusted_folders.toml`). A user-level `~/.claude.json` entry shadows the repo's.                |
| claude      | Interactive sessions honour `enabledMcpjsonServers` only after the folder is trusted.                                                                                                              |
