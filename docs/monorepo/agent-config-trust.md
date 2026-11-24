# Agent-config trust for checkouts

**Related:** [child-repo-hook-overlay.md](./child-repo-hook-overlay.md) (how OT's own hooks reach a
foreign checkout), [foreign-workspace-skill-injection.md](./foreign-workspace-skill-injection.md)
(how OT's skills do). OT plan `01a204c6`.

## The problem

A plan run in a foreign checkout (a registered folder, or a repository cloned from GitHub) used to
load that repository's own agent config headlessly, with no consent step. Claude Code in `-p` mode
connects every server in the workspace `.mcp.json` and fires every hook in `.claude/settings.json`,
alongside OT's plugin hooks. So registering or cloning a repository was enough to let it run
arbitrary commands on the OpenThrottle host the first time a plan ran there.

## The gate

`repository_checkouts.agent_config_trusted` (migration 201) records one user's consent to load a
checkout's own agent config. It defaults to `false`, for new and existing rows alike.

An OT Loop plan run's posture is resolved once, at run start, by `PlanRunWorkspaceService.prepare` from the
**base** checkout (a provisioned worktree is a new row that never carries the user's consent):

| Base checkout                                                 | Posture             |
| ------------------------------------------------------------- | ------------------- |
| The OpenThrottle install itself, or a worktree of it          | trusted (no lookup) |
| A foreign checkout the acting user trusted                    | trusted             |
| A foreign checkout the acting user has not trusted            | isolated            |
| An unregistered directory, no acting user, or a failed lookup | isolated            |

The rule lives in `resolveAgentConfigTrust` (`@openthrottle/openthrottle-agentic-utils`). An
unresolvable OpenThrottle root counts as "not OpenThrottle's own", so every path that cannot be
proven safe ends up isolated.

**Trusted** runs are unchanged, byte for byte: same command, same output, same MCP preflight.

**Isolated** runs:

- spawn the agent so the repository's own hooks, settings and MCP servers do not load, while OT's
  `--plugin-dir` hooks still do;
- get no MCP servers at all: the OT Loop worker uses none of OpenThrottle's, and the checkout's own
  are suppressed;
- skip the workspace MCP preflight, since the checkout's MCP config is never read;
- say so once in plan output: `🔒 Untrusted checkout …`.

## Per-driver isolation

A driver honours isolation only when it advertises `isolatesRepoAgentConfig`. Each driver module
records what was checked, and when.

| Driver      | Isolates | How, or why not                                                                                                |
| ----------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| claude      | yes      | `--setting-sources user --strict-mcp-config --mcp-config <json>`, verified live on 2.1.325.                    |
| cursor      | no       | No settings-source or strict-MCP flag (2026.11.13). Its `--approve-mcps --trust` approve every repo server.    |
| codex       | no       | Loads a project `.codex/` layer for any project the host trusts, and has no per-run flag to skip it (0.167.0). |
| grok        | no       | Reads the workspace `.mcp.json` with no flag to skip it (1.0.77).                                              |
| opencode    | no       | `--pure` skips only external plugins, not the project `opencode.json` (1.19.5).                                |
| antigravity | no       | Not verified: the CLI was not installed when the gate landed.                                                  |

**It fails closed.** An isolated run on a driver that cannot isolate is refused before its first
iteration (`refuseUnlessDriverHonoursPosture`), with the reason in plan output. The drivers engine
refuses the same invocation too (`checkRepoAgentConfig`), so no caller can spawn it by mistake. To
run such a repository, either trust it or run it with Claude Code.

## What the gate does not cover

- **Scheduled agent jobs.** A job that targets a registered checkout spawns in it with no posture,
  so that checkout's own config still loads. Creating the job is a deliberate act, but it is not the
  trust flag; bringing scheduled jobs under the gate is open work.
- **Job-run and lifecycle hook agents.** They spawn in the server's own checkout, never in a
  foreign one.
- **Instructions.** `CLAUDE.md`, `AGENTS.md` and repo skills still load. They are prompt content,
  not something the CLI executes by itself.
- **Environment and network exposure.** The agent still runs with the server's environment and
  network. The env-allowlist plan (`01a204c6-de9a`) and the containment plan (`01a204c6-e136`)
  address those.

## Trusting a repository

Open the repository's page under **Settings → Repositories**. Its _Repo agent config_ card shows
whether it is trusted and how many hooks and MCP servers it defines (counted by repository
inspection from `.claude/settings.json`, `.claude/settings.local.json`, `.cursor/hooks.json`,
`.mcp.json` and `.cursor/mcp.json`). **Trust this repository** flips the flag for all your
checkouts of it; **Revoke trust** flips it back. Over GraphQL it is
`updateRepository(input: { id, agentConfigTrusted })`.
