# Which CLI reads what

Read before changing the `AGENT_SKILL_DIRS` defaults. Dated history: the fan-out list is derived from this verified matrix, not an assumption.

All of these CLIs read the [Agent Skills](https://agentskills.io/) `SKILL.md` standard; they differ only in which directories they scan.

## In-repo matrix (verified 2026-08-26)

Read off the installed binaries/bundles at the versions shown — the CLIs' own shipped docs and path constants, not vendor marketing. Re-verify before changing the fan-out list.

| CLI                   | version    | `.agents/skills` | `.claude/skills` | other dir it also scans              | reached by this layout   |
| --------------------- | ---------- | :--------------: | :--------------: | ------------------------------------ | ------------------------ |
| claude (Claude Code)  | 2.1.232    |        —         |        ✅        | —                                    | ✅ fan-out               |
| cursor (cursor-agent) | 2026.09.10 |        ✅        |        ✅        | `.cursor/skills`                     | ✅ stage 1               |
| grok (Grok Build)     | 1.0.5      |        ✅        |        ✅        | `.grok/skills`                       | ✅ stage 1               |
| antigravity (`agy`)   | 1.1.21     |        ✅        |        —         | — (global `~/.gemini/config/skills`) | ✅ stage 1               |
| codex                 | 0.145.0    |        —         |        —         | — (global `$CODEX_HOME/skills`)      | ❌ no in-repo dir exists |
| opencode              | 1.18.16    |        —         |        —         | `.opencode/skill(s)`                 | ❌ not in the default    |

Notes on the two ❌ rows and the surprises above:

- **codex 0.145.0 has no in-repo skills dir at all.** Skills live only in `$CODEX_HOME/skills` (`~/.codex/skills`). Its `.agents/` handling is plugin-marketplace manifests, not skills. Nothing in-repo can reach it. (Cursor reads `.codex/skills` — that is Cursor's compat scan, not codex's own.)
- **opencode 1.18.16** reads project skills from `.opencode/skill(s)/<name>/SKILL.md`, and its "external" auto-scans are **home-scoped only** (`~/.claude/skills`, `~/.agents/skills` — disableable via `OPENCODE_DISABLE_EXTERNAL_SKILLS`). Add `.opencode/skill` to `AGENT_SKILL_DIRS` if a repo needs it; it is deliberately not a default.
- **Antigravity needs no fan-out.** `agy` discovers `<workspace>/.agents/skills/<name>/` natively (plus the global `~/.gemini/config/skills/` and an `.agents/skills.json` manifest), so stage 1 already covers it.
- **The last column is additive, not exclusive — read it with the two ✅ columns, never alone.**
  Cursor is the row that invites the misreading: `.cursor/skills` in that column does **not** mean
  Cursor needs one. Its ✅ under `.agents/skills` is what matters, and that is why this repo
  deliberately generates no `.cursor/skills` — consistent with the drift rule in § What `--check`
  validates below. Re-verified 2026-09-14 against cursor-agent 2026.09.10: the shipped bundle
  carries path constants for `.cursor/skills`, `.agents/skills`, `.claude/skills`, `.grok/skills`
  and `.codex/skills` — Cursor scans all five, so naming any one of them as "Cursor's skills dir"
  is the error. Only the cursor row was re-probed; the other rows still stand at 2026-08-26.
- **Claude Code 2.1.232 does not read `.agents/skills`.** `.claude/skills` is its only in-repo skills dir, which is exactly why the fan-out exists.

Several CLIs additionally read per-tool **global** dirs (`~/.claude/skills`, `~/.codex/skills`, `~/.grok/skills`, `~/.gemini/config/skills`) that live outside any repo and are not part of this layout.
