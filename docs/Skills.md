# 🧰 Agent Skills

Skills here are **[Agent Skills](https://agentskills.io/)** — the open format (folder + `SKILL.md`) that Claude Code, Cursor, Codex, Grok Build, OpenCode, Copilot, Gemini CLI, and others already speak. OpenThrottle manages them so **every tool sees the same skills from the same starting point**, regardless of who installed them or which tool they used. Author against the [specification](https://agentskills.io/specification); do not invent a parallel format.

The mechanism is the **`skill-sync`** skill — see [`skills/skill-sync/SKILL.md`](../skills/skill-sync/SKILL.md) for the full contract. This page is the human-facing summary of the policy + what's installed.

## Architecture (skill-sync)

Two-stage layout with strict ownership:

| Location                                      | Contents                                                                                                                                                                                                                        | Owned by         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `skills/`                                     | Hand-authored, **OT-owned** skills, committed to git. Edit our own skills here.                                                                                                                                                 | Humans (via PRs) |
| `.agents/skills/`                             | Generated merged SSOT view most CLIs read in-repo (Claude Code, Cursor 2.4+, Codex, OpenCode). **Real dirs** = external installs (tracked in `skills-lock.json`). **Symlinks** = our own `skills/*`. **Never hand-edit.**       | skill-sync       |
| `<agent>/skills/` (default `.claude/skills/`) | Per-agent fan-out for CLIs that read a `.claude`-style dir (e.g. Grok Build; Cursor reads both). `.agents/skills/` + `.claude/skills/` are the two near-universal in-repo targets. All symlinks, all generated, all gitignored. | skill-sync       |

```bash
# Rebuild/refresh the layout (idempotent, safe to re-run)
bash skills/skill-sync/scripts/sync.sh

# Validate without writing; exit 1 on drift — the CI drift gate
bash skills/skill-sync/scripts/sync.sh --check
```

**Tracking authority is [`skills-lock.json`](../skills-lock.json)** (hash-pinned per external skill). This doc is a summary, not the ledger.

## Adoption policy (hard stance)

1. **External skills installed via the `skills` package stay 1:1 with upstream.** Never hand-edit or fork-and-mutate a vendored install — a re-pull/re-sync would blow the edits away, and we don't own that content. Install exactly as documented:

   ```bash
   npx skills add <owner>/<repo> --skill <name> --agent universal   # lands only in .agents/skills/
   bash skills/skill-sync/scripts/sync.sh                            # then always sync
   ```

2. **Need OpenThrottle-specific customization?** Do **not** edit the vendored skill. Author a **separate OT-owned skill or rule in `skills/`** that references/connects to the vendored one.
   - **Exemplar:** the vendored `frontend-design` skill stays pristine; OT's stack is layered via the companion rule [`.agents/rules/coding/frontend-design-openthrottle.mdc`](../.agents/rules/coding/frontend-design-openthrottle.mdc).

3. **Author our own capabilities as OT-owned skills in `skills/`** (see the list below). These are ours to edit freely.

4. **Avoid duplicating existing OpenThrottle capabilities:** `/code-review`, `/review`, `/security-review`; OT plans/tasks traceability (`Plan-Id` / `Task-Id`); the conventional-commit + no-`Co-authored-by` rules.

## Installed external skills (1:1)

Source of truth: `skills-lock.json`. Grouped by upstream:

| Source                     | Skills                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `github/awesome-copilot`   | brag-sheet, create-readme, git-commit                                                               |
| `steipete/agent-scripts`   | create-cli, frontend-design, skill-cleaner                                                          |
| `mattpocock/skills`        | grill-me, grill-with-docs, grilling, handoff, teach, writing-great-skills                           |
| `shadcn/improve`           | improve                                                                                             |
| `nrwl/nx-ai-agents-config` | link-workspace-packages, monitor-ci, nx-generate, nx-import, nx-plugins, nx-run-tasks, nx-workspace |

## OT-owned skills (`skills/`)

Ours to author and edit; fanned out by skill-sync:

- **Agents/workflow:** agents-ralph, workflow-ralph, validate-plan
- **GitHub:** github-branch, github-commit, github-create-issue, github-my-pull-requests, github-pull-request, github-squash, github-summarize, github-untracked, github-worktree
- **OpenThrottle:** openthrottle-folders, openthrottle-generators, openthrottle-stack, ot-ask, ot-create-plan, ot-edit-task, ot-list-by-status, ot-list-sources, ot-pending, ot-planning-mode, ot-plans, ot-postgres
- **Infra:** skill-sync

## Not adopted (skip-list)

Recorded so these aren't re-litigated.

**Evaluated then dropped:**

- **github-deep-review, github-project-triage** — agent-scripts-origin; carried Peter/RepoBar/OpenClaw content that isn't ours to maintain, and overlapped existing `/code-review`, `/review`, `/security-review` and OT plans/tasks for triage. Dropped 2026-07-19.
- **markdown-converter** (uvx markitdown) — dropped; not worth the budget vs the current docs-ingest flow.
- **npm** — dropped; OpenThrottle releases via Nx, not raw npm.

**agent-scripts categories intentionally skipped** (not relevant to this repo):

- Apple/Swift/native: hopper, instruments, native-app-performance, release-mac-app, swift\*, vm-lab
- Personal comms: beeper, imsg, whatsapp, wacli, wacrawl, slacrawl, discrawl, discord-clawd, birdclaw, gog, notcrawl, sonos, things-todo, reminders, speaking, twilio-sms, obsidian
- macOS-host/personal infra: cloudflare-registrar, domain-dns-ops, one-password, remote-mac, ssh-doctor, wrangler, mac-maintenance, release-tweets, clickclack
- Media/X: nano-banana-pro, openai-image-gen, peekaboo, xurl, video-transcript-downloader, browser-use
- Peter-specific plumbing: github-cache-hygiene, github-author-context, maintainer-orchestrator, codex-debugging, clawsweeper-status, openclaw-relay, agent-transcript, autoreview

## Browsing for more

- [agentskills.io](https://agentskills.io/) — the open Agent Skills format this repo implements ([specification](https://agentskills.io/specification), [best practices](https://agentskills.io/skill-creation/best-practices)). See also [`skills/README.md`](../skills/README.md).
- [skills.sh](https://skills.sh/) — registry of installable skills. Install any worth adopting via the `npx skills add … --agent universal` flow above, then `sync.sh`.
