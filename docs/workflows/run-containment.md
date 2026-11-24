# Run containment — the filesystem and network boundary for unattended runs

OpenThrottle runs agents with nobody watching: OT Loop plan runs, scheduled agent jobs and
webhook-triggered jobs. For those runs OT chooses the boundary itself, instead of leaving it to
whatever each CLI defaults to. It does that through each CLI's **own** sandbox, never an OT-built
proxy.

The boundary is the second half of a pair. The [agent child environment](../monorepo/environment-variables.md#agent-child-environment)
keeps the server's secrets out of the agent's env. Containment caps what the agent can touch with
the credentials it does get.

## The profile

A run's profile has two axes:

| Axis         | Values                                                 | Meaning                                                                |
| ------------ | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `filesystem` | `worktree-write`, `unrestricted`                       | Writes limited to the run's working directory, or no OT-imposed limit. |
| `network`    | `{ mode: 'allowlist', hosts }`, `deny`, `unrestricted` | Egress to listed hosts only, no egress, or no OT-imposed limit.        |

**The default is `worktree-write` plus an allowlist** of the hosts in [Default hosts](#default-hosts-and-what-each-one-grants).
It applies to every OT Loop run whose plan sets no profile, every run queued before containment
existed, and every scheduled and webhook-triggered job (those carry no run config).

Where it lives:

- **OT Loop**: `runConfigJson.containment` on the plan, next to `run`. Enqueue resolves it once
  (`resolvePlanRunContainmentProfile` in `@openthrottle/openthrottle-plan-config`) onto the BullMQ
  job and the run-config snapshot, so editing the plan never changes a queued run's boundary.
- **Scheduled and webhook jobs**: always the default, in `scheduled-agent-jobs.processor.ts`.

Code: the profile and resolver are in `packages/openthrottle-plan-config`, the per-CLI mapping in
`packages/openthrottle-drivers/src/utils/containment.ts`, and the server glue in
`applications/openthrottle-server/src/services/run-containment/`.

## What each driver enforces

Verified on macOS, 2026-11-24, with the flags the drivers emit (results in plan
`01a204c6-e136-7d15-8456-6ecbdbc3da4e`):

| Driver      | Version    | Filesystem | Network: deny | Network: allowlist | Mechanism                                                                                       |
| ----------- | ---------- | ---------- | ------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| claude      | 2.1.325    | yes        | yes           | yes                | `--settings '<json>'`: `sandbox.enabled`, `filesystem.allowWrite`, `network.allowedDomains`     |
| codex       | 0.167.0    | yes        | yes           | **no**             | `--sandbox workspace-write` plus `-c sandbox_workspace_write.network_access` / `writable_roots` |
| cursor      | 2026.11.13 | no         | no            | no                 | Has `--sandbox enabled`, but OT has not verified what it bounds                                 |
| grok        | 1.0.77     | no         | no            | no                 | Has `--sandbox <PROFILE>`; its profiles are undocumented                                        |
| antigravity | 1.5.14     | no         | no            | no                 | Has `--sandbox` (terminal restrictions), unverified                                             |
| opencode    | 1.19.5     | no         | no            | no                 | No sandbox flag                                                                                 |

**A driver that cannot enforce an axis warns; it does not fail the run.** At run start the run
says one `containment warning: …` line naming every axis it cannot enforce: in plan output for OT
Loop, and in the server log and the run's own output for scheduled jobs. Codex under an allowlist
is the common case. It has no host allowlist, so OT leaves its network setting alone, and under
`workspace-write` that means **no** egress. That is stricter than asked, and it is the CLI's
behaviour without OT, so nothing widens.

### What the sandbox does and does not cover

- **Writable under `worktree-write`**: the working directory, `$TMPDIR` (codex also `/tmp`), and, in
  a linked worktree, that worktree's private git dir (`.git/worktrees/<name>`: its index and HEAD,
  so `git status` works). The shared object store is not writable, so a contained worker **cannot
  commit**. OT Loop's worker prompt forbids that anyway; the job commits.
- **Claude's sandbox covers Bash and its children only.** Its Read, Edit and Write tools follow the
  permission mode, and `acceptEdits` keeps edits in the working directory. WebFetch and WebSearch
  are not sandboxed, so the profile is mirrored into permission rules: `deny` refuses both, and an
  allowlist allows `WebFetch(domain:<host>)` for the listed hosts only.
- **The CLI's own traffic runs outside the sandbox**: its model provider and the MCP servers it
  starts (including `openthrottle-mcp`). That is why the default hosts do not include the provider
  or the OT API.
- **Which Bash commands run is still the repo's call.** OT does not set Claude's
  `autoAllowBashIfSandboxed`, so a headless command outside the repo's permission rules is still
  refused, sandbox or not.
- **Reads are not contained.** The profile bounds writes and egress. An agent can still read
  anything its user can, including another process's `/proc/<pid>/environ` in a shared container.
  The env allowlist keeps secrets out of the agent's own env, not out of the box.
- **Linux needs `bubblewrap` and `socat`** for Claude's sandbox. OT sets `failIfUnavailable: false`,
  so a host without them runs Claude **unsandboxed** rather than refusing to start, in line with
  warn-not-fail. Nothing reports that fallback at run start yet.

## Default hosts, and what each one grants

**An allowlisted host is a capability grant, not a destination filter.** Allowing a host allows
everything any credential in reach can do there. The agent's env is already cut down to the
[allowlist](../monorepo/environment-variables.md#agent-child-environment), but a credential the
operator passes through, or one stored in a keychain or config file the CLI can read, travels with
the request.

| Host                            | Needed for                          | What it grants with the credentials present                                                                                                                          |
| ------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registry.npmjs.org`            | `pnpm install`                      | Read-only package downloads. With an npm token in reach (`NPM_TOKEN`, `~/.npmrc`), **publishing** any package that token can publish.                                |
| `github.com`                    | `git fetch` / `git push` over HTTPS | With a git credential helper or `GH_TOKEN`, pushing to **every repository the credential reaches**, not just this one.                                               |
| `api.github.com`                | `gh`                                | With `gh`'s keychain login or `GH_TOKEN` / `GITHUB_TOKEN`, the full API as that user: PRs, issues, releases, repo settings, on every repository the token can reach. |
| `codeload.github.com`           | Tarball and archive downloads       | Read access to archives the credential can see (private repos included).                                                                                             |
| `objects.githubusercontent.com` | Release assets and LFS downloads    | Read access to assets the credential can see.                                                                                                                        |

The GitHub hosts are the expensive grant. A webhook-triggered job runs attacker-authored text
([webhook-triggered-agent-jobs.md](../openthrottle/webhook-triggered-agent-jobs.md), T4). If the
install passes `GH_TOKEN` through, a prompt-injected agent can use it against any repository it
reaches. Keep that token scoped to the repositories OT works on, or leave it out and let `gh` fail.

## Changing a plan's profile

There is no UI for it yet. Set `containment` in the plan's `runConfigJson` with `update_plan`. The
field replaces the whole stored value, so read the current one with `get_plan` and add the key to
it:

```json
{
  "containment": {
    "filesystem": "worktree-write",
    "network": {
      "hosts": [
        "api.github.com",
        "github.com",
        "registry.npmjs.org",
        "proxy.golang.org"
      ],
      "mode": "allowlist"
    }
  },
  "run": { "…": "unchanged" },
  "target": { "…": "unchanged" },
  "version": 1,
  "workspace": { "…": "unchanged" }
}
```

Hosts are bare names, optionally `*.`-prefixed (`*.githubusercontent.com`), with no scheme, port
or path. To opt a plan out entirely, set both axes to `unrestricted`. Every host you add widens the
grant described above.

## Decisions

- **No OT egress proxy.** Custom proxies and glue were where containment flaws turned up in practice.
  OT drives each CLI's own sandbox and says plainly where a CLI has none.
- **Warn, don't fail closed** (maintainer, 2026-11-22). A driver without a sandbox still runs, with
  a run-start warning.
- **One default for every unattended run kind.** Profiles differ per plan, never per runner.

## Checking it

`OT_CONTAINMENT_LIVE=1 pnpm nx run openthrottle-drivers:test -- src/utils/__tests__/containment.integration.test.ts`
runs each installed CLI with the emitted flags and a probe that writes inside and outside its
working directory and reaches an allowed and a non-allowed host. A missing CLI is skipped. The
Claude case makes one small model call.
