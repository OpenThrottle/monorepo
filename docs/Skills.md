# 🧰 Agent Skills

Skills here are **[Agent Skills](https://agentskills.io/)** — the open format (folder + `SKILL.md`) that Claude Code, Cursor, Codex, Grok Build, OpenCode, Copilot, Gemini CLI, and others already speak. OpenThrottle manages them so **every tool sees the same skills from the same starting point**, regardless of who installed them or which tool they used. Author against the [specification](https://agentskills.io/specification); do not invent a parallel format.

The mechanism is the **`ot-skill-sync`** skill — see [`skills/ot-skill-sync/SKILL.md`](../skills/ot-skill-sync/SKILL.md) for the full contract. This page is the human-facing summary of the policy + what's installed.

> **Rename (2026-08):** formerly `skill-sync`. Downstream repos that installed via
> `npx skills add openthrottle/monorepo --skill skill-sync` must remove that install
> and re-add with `--skill ot-skill-sync`.

## Architecture (ot-skill-sync)

Two-stage layout with strict ownership:

| Location                                                          | Contents                                                                                                                                                                                                                                                                                                                                                                                        | Owned by         |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `skills/`                                                         | Hand-authored, **OT-owned** skills, committed to git. Edit our own skills here.                                                                                                                                                                                                                                                                                                                 | Humans (via PRs) |
| `.agents/skills/`                                                 | Generated merged SSOT view read in-repo by Cursor, Grok Build, and Antigravity (`agy`). **Real dirs** = external installs (tracked in `skills-lock.json`). **Symlinks** = our own `skills/*`. **Never hand-edit.**                                                                                                                                                                              | ot-skill-sync    |
| `<agent>/skills/` (default `.claude/skills/` + `.gemini/skills/`) | Per-agent fan-out for the CLIs that can't see `.agents/skills/` in-repo: Claude Code (`.claude/skills`) and the Gemini CLI (`.gemini/skills`). Cursor, Grok, and `agy` read `.agents/skills/` directly, so there is **no** `.cursor/skills` fan-out. Verified per-CLI matrix: [`skills/ot-skill-sync/SKILL.md`](../skills/ot-skill-sync/SKILL.md). All symlinks, all generated, all gitignored. | ot-skill-sync    |

```bash
# Rebuild/refresh the layout (idempotent, safe to re-run)
bash skills/ot-skill-sync/scripts/sync.sh

# Validate without writing; exit 1 on drift — the CI drift gate
bash skills/ot-skill-sync/scripts/sync.sh --check
```

**Tracking authority is [`skills-lock.json`](../skills-lock.json)** (hash-pinned per external skill). This doc is a summary, not the ledger.

**Usage telemetry** for skills is recorded in `skill_usage_events` / `skill_usage_outcomes`. Before you delete a skill because it shows zero invocations, read [`docs/monorepo/skill-usage-telemetry-scope.md`](monorepo/skill-usage-telemetry-scope.md) — it documents which invocation paths are captured and which are structurally invisible, so a `0` is read correctly.

## Adoption policy (hard stance)

1. **External skills installed via the `skills` package stay 1:1 with upstream.** Never hand-edit or fork-and-mutate a vendored install — a re-pull/re-sync would blow the edits away, and we don't own that content. Install exactly as documented:

   ```bash
   npx skills add <owner>/<repo> --skill <name> --agent universal   # lands only in .agents/skills/
   bash skills/ot-skill-sync/scripts/sync.sh                         # then always sync
   ```

   The app enforces this, it is not just convention: `/skills/:slug` disables
   Edit for an `external` skill and `writeSkillFileBySlug` refuses the write
   server-side, while record-level tags and availability rules stay editable
   because they are database rows rather than SKILL.md content. See
   [repo-skills-discovery-design.md](../applications/openthrottle-developer/docs/repo-skills-discovery-design.md)
   § "External skills are read-only".

2. **Need OpenThrottle-specific customization?** Do **not** edit the vendored skill. Author a **separate OT-owned skill or rule in `skills/`** that references/connects to the vendored one.
   - **Exemplar:** the vendored `frontend-design` skill stays pristine; OT's stack is layered via the companion rule [`.agents/rules/coding/frontend-design-openthrottle.mdc`](../.agents/rules/coding/frontend-design-openthrottle.mdc).

3. **Author our own capabilities as OT-owned skills in `skills/`** (see the list below). These are ours to edit freely.

4. **Avoid duplicating existing OpenThrottle capabilities:** `/code-review`, `/review`, `/security-review`; OT plans/tasks traceability (`Plan-Id` / `Task-Id`); the conventional-commit + no-`Co-authored-by` rules.

## Installed external skills (1:1)

Source of truth: `skills-lock.json`. Grouped by upstream:

| Source                     | Skills                                            |
| -------------------------- | ------------------------------------------------- |
| `steipete/agent-scripts`   | frontend-design                                   |
| `mattpocock/skills`        | grilling                                          |
| `shadcn/improve`           | improve                                           |
| `nrwl/nx-ai-agents-config` | link-workspace-packages, monitor-ci, nx-workspace |

## OT-owned skills (`skills/`)

Ours to author and edit; fanned out by ot-skill-sync:

- **Agents/workflow:** agents-ralph, ot-claude-loop, validate-plan
- **GitHub:** github-commit, github-pull-request, github-squash
- **OpenThrottle:** ot-folders, ot-generators, ot-onboarding, ot-plans, ot-postgres, ot-stack
- **Infra:** ot-skill-sync

## Always-on description budget

Every skill's frontmatter `description` sits in the context window of every session whether or not
the skill fires, so it is a standing cost. **Measured 2026-08-20: 20 skills, 6,212 chars,
~1,553 tokens** — down from 44 skills / 16,918 chars / ~4,229 tokens.

A description answers exactly one question: _should the model open this file right now?_ That means
trigger conditions plus the explicit not-this-skill disambiguators, and nothing else. Feature
inventories, flag lists and tool enumerations belong in the body, where they cost nothing until the
skill is actually opened. See [`skills/README.md`](../skills/README.md) § Writing a skill that earns
its context.

Keep OT-owned descriptions under ~400 chars. The four still above it
(`link-workspace-packages`, `improve`, `nx-workspace`, `monitor-ci`) are **vendored** — the adoption
policy above forbids hand-editing them, so their length is the price of installing them 1:1.

Re-measure after any add or delete:

```bash
python3 - <<'EOF'
import re, pathlib
rows = []
for d in sorted(pathlib.Path('.agents/skills').iterdir()):
    f = d / 'SKILL.md'
    if not f.exists():
        continue
    m = re.match(r'^---\n(.*?)\n---\n', f.read_text(), re.S)
    if not m:
        continue
    dm = re.search(r'^description:\s*(?:>-|>|\|)?\s*\n?((?:.|\n)*?)(?=\n[a-zA-Z-]+:|\Z)', m.group(1), re.M)
    rows.append((len(' '.join(dm.group(1).split())) if dm else 0, d.name))
rows.sort(reverse=True)
for n, name in rows:
    print(f'{n:5}  {name}')
total = sum(n for n, _ in rows)
print(f'\n{len(rows)} skills, {total} chars, ~{total // 4} tokens')
EOF
```

## Not adopted (skip-list)

Recorded so these aren't re-litigated.

**Evaluated then dropped:**

- **github-deep-review, github-project-triage** — agent-scripts-origin; carried Peter/RepoBar/OpenClaw content that isn't ours to maintain, and overlapped existing `/code-review`, `/review`, `/security-review` and OT plans/tasks for triage. Dropped 2026-07-19.
- **markdown-converter** (uvx markitdown) — dropped; not worth the budget vs the current docs-ingest flow.
- **npm** — dropped; OpenThrottle releases via Nx, not raw npm.
- **github-branch, github-create-issue, github-my-pull-requests, github-summarize, github-untracked, github-worktree** — the dead tail of the `github-*` family, all zero uses. Several were also broken: `github-branch` told the model to use a slash command it is not allowed to invoke (`disable-model-invocation`), `github-my-pull-requests` called Copilot-only tools (`#githubRepo`, `#list_pull_requests`) that do not exist here, `github-untracked` ended on a literal "TODO: Wrap this up" in front of `git clean -f`, and `github-worktree` hardcoded personal absolute paths and told the agent to open Cursor, against CLAUDE.md's `pnpm run worktree:new` as the one entrypoint. Branch creation now belongs to `worktree:new`. Dropped 2026-08-20.
- **create-cli, create-readme, handoff, skill-cleaner, skillopt-sleep, teach, writing-great-skills** — vendored grab-bag, zero uses, no place in any OpenThrottle workflow. `handoff`, `teach` and `writing-great-skills` are slash-only, so their zero is a trustworthy zero. `skillopt-sleep` drives an external engine that has never been run here; `skill-cleaner` is Codex/OpenClaw-oriented and this trim did its job by hand; `create-cli` and `create-readme` cover authoring this repo does not do. `writing-great-skills`' guidance was harvested into [`skills/README.md`](../skills/README.md) first. Dropped 2026-08-20.
- **nx-generate, nx-import, nx-plugins, nx-run-tasks** — nrwl-origin, ~3.4k words, zero uses. `nx-generate` actively contradicted this repo: CLAUDE.md mandates `@tools/generators` with `NX_ISOLATE_PLUGINS=false`, while it taught generic `nx g` and claimed "INVOKE IMMEDIATELY" on the word _scaffold_ — a mis-routing risk, not just dead weight. `nx-import` covers a one-time workspace-adoption scenario long since done. `nx-plugins` was a two-line stub. `nx-run-tasks` restated CLAUDE.md's always-on command table. **`nx-workspace` is kept** — the `nx-mcp` server is not registered in the repo's `.mcp.json`, so it cannot be relied on as the fallback for workspace exploration and debugging failed targets. Dropped 2026-08-20.
- **grill-me, grill-with-docs** — mattpocock-origin; three skills for one behavior. `grill-me`'s entire body was "Run a `/grilling` session", and `grill-with-docs` delegated to a `/domain-modeling` skill this repo has never installed, so it was a broken pointer. `grilling` survives as the single grill skill. Dropped 2026-08-20.

**agent-scripts categories intentionally skipped** (not relevant to this repo):

- Apple/Swift/native: hopper, instruments, native-app-performance, release-mac-app, swift\*, vm-lab
- Personal comms: beeper, imsg, whatsapp, wacli, wacrawl, slacrawl, discrawl, discord-clawd, birdclaw, gog, notcrawl, sonos, things-todo, reminders, speaking, twilio-sms, obsidian
- macOS-host/personal infra: cloudflare-registrar, domain-dns-ops, one-password, remote-mac, ssh-doctor, wrangler, mac-maintenance, release-tweets, clickclack
- Media/X: nano-banana-pro, openai-image-gen, peekaboo, xurl, video-transcript-downloader, browser-use
- Peter-specific plumbing: github-cache-hygiene, github-author-context, maintainer-orchestrator, codex-debugging, clawsweeper-status, openclaw-relay, agent-transcript, autoreview

## Browsing for more

- [agentskills.io](https://agentskills.io/) — the open Agent Skills format this repo implements ([specification](https://agentskills.io/specification), [best practices](https://agentskills.io/skill-creation/best-practices)). See also [`skills/README.md`](../skills/README.md).
- [skills.sh](https://skills.sh/) — registry of installable skills. Install any worth adopting via the `npx skills add … --agent universal` flow above, then `sync.sh`.
