# 🧰 Agent Skills

Skills here are **[Agent Skills](https://agentskills.io/)** — the open format (folder + `SKILL.md`) that Claude Code, Cursor, Codex, Grok Build, OpenCode, Copilot, Antigravity, and others already speak. OpenThrottle manages them so **every tool sees the same skills from the same starting point**, regardless of who installed them or which tool they used. Author against the [specification](https://agentskills.io/specification); do not invent a parallel format.

The mechanism is the **`ot-skill-sync`** skill — see [`skills/ot-skill-sync/SKILL.md`](../skills/ot-skill-sync/SKILL.md) for the full contract. This page is the human-facing summary of the policy + what's installed.

> **Rename (2026-08):** formerly `skill-sync`. Downstream repos that installed via
> `npx skills add openthrottle/monorepo --skill skill-sync` must remove that install
> and re-add with `--skill ot-skill-sync`.

## Architecture (ot-skill-sync)

Two-stage layout with strict ownership:

| Location                                      | Contents                                                                                                                                                                                                                                                                                                                                                  | Owned by         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `skills/`                                     | Hand-authored, **OT-owned** skills, committed to git. Edit our own skills here.                                                                                                                                                                                                                                                                           | Humans (via PRs) |
| `.agents/skills/`                             | Generated merged SSOT view read in-repo by Cursor, Grok Build, and Antigravity (`agy`). **Real dirs** = external installs (tracked in `skills-lock.json`). **Symlinks** = our own `skills/*`. **Never hand-edit.**                                                                                                                                        | ot-skill-sync    |
| `<agent>/skills/` (default `.claude/skills/`) | Per-agent fan-out for the CLIs that can't see `.agents/skills/` in-repo: Claude Code (`.claude/skills`). Cursor, Grok, and `agy` read `.agents/skills/` directly, so there is **no** `.cursor/skills` fan-out. Verified per-CLI matrix: [`skills/ot-skill-sync/SKILL.md`](../skills/ot-skill-sync/SKILL.md). All symlinks, all generated, all gitignored. | ot-skill-sync    |

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
   - **Exemplar:** the vendored `frontend-design` skill stays pristine; OT's stack is layered on top of it in [`docs/monorepo/code-style.md`](./monorepo/code-style.md#frontend-design).

3. **Author our own capabilities as OT-owned skills in `skills/`** (see the list below). These are ours to edit freely.

4. **Avoid duplicating existing capabilities.**
   - **OpenThrottle's own:** OT plans/tasks traceability (`Plan-Id` / `Task-Id`) and the conventional-commit and no-attribution rules.
   - **Claude Code built-ins:** `/code-review`, `/review` and `/security-review`. These ship with the Claude Code CLI, not with this repo, so Codex, Cursor, Gemini and OpenCode don't have them. An OT-owned skill can leave the generic bug review to them, but it can't assume every agent has one.

## Installed external skills (1:1)

Source of truth: `skills-lock.json`. Grouped by upstream:

| Source                     | Skills                                            |
| -------------------------- | ------------------------------------------------- |
| `steipete/agent-scripts`   | frontend-design                                   |
| `mattpocock/skills`        | grilling                                          |
| `nrwl/nx-ai-agents-config` | link-workspace-packages, monitor-ci, nx-workspace |
| `unclebob/ub-mode`         | ub-mode                                           |

`ub-mode` was vendored in PR #586 (2026-10-25) so `/ub-mode` is available on demand: a reduced
set of engineering principles (make it work, make it right, practice). Repo rules win where it
disagrees.

### Known conflicts with house rules

Vendored skills cannot be edited, so where one disagrees with this repo the owned side says which
wins. Recorded 2026-11-22 (skills audit, plan 18a3e017); keep-or-remove is reassessed in plan
0c3d8271.

- **frontend-design** tells the agent to commit to a bold aesthetic, avoid common fonts and choose
  unexpected layouts. Root AGENTS.md § Code style requires `@openthrottle/react-router-shadcn`
  components and the existing Tailwind tokens. In the audit's routing test both product-UI requests
  went to frontend-design. The house rules win in every `react-router-*` app and package (stated in
  `ot-stack`); frontend-design fits greenfield pages such as the marketing website.
- **link-workspace-packages** says to add workspace dependencies with the package manager, never by
  editing `package.json`. Here `pnpm add <pkg>@workspace:^` wrongly catalogs the dependency in
  `pnpm-workspace.yaml`, so `ot-generators` says to write `"<pkg>": "workspace:^"` and run
  `pnpm install`, and that it overrides this skill.
- **monitor-ci** is written for Nx Cloud self-healing CI. `nx.json` has no Nx Cloud id, and CI is
  GitHub Actions, so it has nothing to monitor here; it still matches one-off "why did CI fail"
  requests.

### To raise upstream

Not filed yet: opening an issue on another project is the maintainer's call.

- `nrwl/nx-ai-agents-config` / monitor-ci: `allowed-tools` is a YAML list where the spec wants a
  space-separated string; `user-invocable` and `argument-hint` are client-specific top-level keys
  with no reason given.
- `steipete/agent-scripts` / frontend-design: the description ("Frontend UI: pages, apps,
  components, polished non-generic design.") gives no "when" and no "not for", so it matches any UI
  request in any repo, including ones with a design system.

Not checked on 2026-11-22: whether any `skills-lock.json` entry is behind its upstream.

## OT-owned skills (`skills/`)

Ours to author and edit; fanned out by ot-skill-sync. This is the one catalog: other files link here rather than keep their own list. The `github-*` skills are portable: each resolves the host repo first and falls back to defaults it ships with (a PR template, an attribution guard, plain Conventional Commits) where this repo's files are missing.

**Git workflow**

- [`github-cleanup`](../skills/github-cleanup/SKILL.md) — delete local branches whose work already landed (squash merges included)
- [`github-commit`](../skills/github-commit/SKILL.md) — write a conventional-commits message from the diff
- [`github-pull-request`](../skills/github-pull-request/SKILL.md) — create or update a great Pull Request
- [`github-squash`](../skills/github-squash/SKILL.md) — squash the branch to a single commit

**Plans and execution**

- [`ot-plans`](../skills/ot-plans/SKILL.md) — plans and tasks via the `openthrottle-mcp` server, plus the `Plan-Id`/`Task-Id` and work-ledger traceability rules.
- [`ot-loop`](../skills/ot-loop/SKILL.md) — drive one OT plan to a PR with the built-in `/loop`, a task at a time in an isolated worktree. Canonical source of the per-task discipline.
- [`ot-onboarding`](../skills/ot-onboarding/SKILL.md) — the front-door orientation skill new users invoke first: verifies the OT MCP is healthy, then tours the mental model, monorepo, shortcuts/workflows, and the skill catalog.

**Code conventions**

- [`ot-generators`](../skills/ot-generators/SKILL.md) — scaffolding with `@tools/generators`: which generator makes an app, package, component, route or NestJS service, and how to run one.
- [`ot-folders`](../skills/ot-folders/SKILL.md) — where code goes, what it is named, what shape it must have, and how to prove it — the placement rules behind the `openthrottle/*` lint rules and module boundaries.
- [`ot-client-node-boundary`](../skills/ot-client-node-boundary/SKILL.md) — the client/Node boundary lint and typecheck cannot see (`node:*` in browser bundles).
- [`ot-stack`](../skills/ot-stack/SKILL.md) — conventions for the platform itself: `openthrottle-server`, the developer app, the GraphQL schema, embeddings and semantic ingest.
- [`ot-postgres`](../skills/ot-postgres/SKILL.md) — SQL authoring under `databases/`: migrations, table design and naming, `COMMENT ON` standards, idempotent DDL.

**Infrastructure**

- [`ot-worktree`](../skills/ot-worktree/SKILL.md) — the portable machinery behind `worktree:new`, `worktree:heal` and `worktree:remove`: creating, provisioning and tearing down a worktree.
- [`ot-skill-guide`](../skills/ot-skill-guide/SKILL.md) — author and review skills against the [Agent Skills specification](https://agentskills.io/specification): author and review modes, a severity-graded checklist, and `scripts/check.sh`. The rolling review runs as `Job_SkillReview`.
- [`ot-skill-sync`](../skills/ot-skill-sync/SKILL.md) — manages this whole architecture in any repo: consistent installs, deterministic fan-out, and the CI drift check.

## Personal skills (`~/.openthrottle/skills`)

**Both tables above list committed skills only, by design.** A personal skill is yours alone: it
lives outside the repo at `~/.openthrottle/skills/<name>/SKILL.md` (override with
`OPENTHROTTLE_PERSONAL_SKILLS_DIR`), and ot-skill-sync links it into `.agents/skills/` and every
agent fan-out dir exactly like a committed one. Nothing about it is committable — not the content,
which is never in the worktree, and not the generated links, which the managed `.gitignore` block
covers and a pre-commit guard refuses to stage. So it can never appear in `skills-lock.json` (that
file records `npx skills` installs) or in the tables above (those record what the repo ships).

```bash
bash skills/ot-skill-sync/scripts/personal.sh new <name>       # scaffold + sync
bash skills/ot-skill-sync/scripts/personal.sh list             # what you have, and where it links
bash skills/ot-skill-sync/scripts/personal.sh promote <name>   # graduate it into skills/
```

A personal skill sharing a name with a committed one is a hard sync error, so nobody silently runs a
private fork of a team skill; `--allow-shadow` is the explicit opt-in when that is what you want.
Full design: [foreign-workspace-skill-injection.md](monorepo/foreign-workspace-skill-injection.md)
§7.

## Always-on description budget

Every skill's frontmatter `description` sits in the context window of every session whether or not
the skill fires, so it is a standing cost. **Measured 2026-11-23, after the skills remediation and the Ralph retirement: 21
committed skills (15 owned, 6 vendored), 7,222 chars, ~1,806 tokens**; the owned 15 are 5,443 of
that. On 2026-11-22, before both, the owned 16 were 6,253. Earlier: 19 skills /
5,916 chars on 2026-08-28, and 44 skills / 16,918 chars before the August trim.

A description answers exactly one question: _should the model open this file right now?_ That means
trigger conditions plus the explicit not-this-skill disambiguators, and nothing else. Feature
inventories, flag lists and tool enumerations belong in the body, where they cost nothing until the
skill is actually opened. The authoring rule is in the
[`ot-skill-guide`](../skills/ot-skill-guide/SKILL.md) skill.

**The limit is the specification's 1024 characters, and it is a ceiling, not a target.** There is
no house number below it: a description is done when every clause is a trigger or a "Not for"
disambiguator, whatever its length, and one near 1024 needs a reason. What stops silent growth is
the ratchet: `pnpm nx run monorepo:check-model-facing-text` fails when any description grows past
`scripts/model-facing-text.snapshot.json`. Vendored descriptions cannot be edited (adoption policy
above), so their length is the price of installing them 1:1.

**Your personal skills do count — against your own budget, not the team's.** The CLI loads them
like anything else, and the snippet below walks `.agents/skills/`, so it counts whatever you have
linked. The measurement quoted above is the committed baseline everyone pays; the difference is what
your personal tier costs you. Point the snippet at `skills/` instead to re-measure the shared
baseline.

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

- **github-deep-review, github-project-triage** — agent-scripts-origin; carried Peter/RepoBar/OpenClaw content that isn't ours to maintain, and overlapped Claude Code's built-in `/code-review`, `/review`, `/security-review` and OT plans/tasks for triage. Dropped 2026-07-19.
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
