# Skill review checklist

Work through every item for each skill. Each item's severity is the one to grade a failure at.
Sources: **[S]** [Specification](https://agentskills.io/specification), **[BP]**
[Best practices](https://agentskills.io/skill-creation/best-practices), **[D]**
[Optimizing descriptions](https://agentskills.io/skill-creation/optimizing-descriptions), **[SC]**
[Using scripts](https://agentskills.io/skill-creation/using-scripts).

Items marked ⚙ are checked mechanically by `scripts/check.sh`. Read its output rather than judging
them by eye.

## `spec` — violates the specification

- [ ] ⚙ `SKILL.md` exists and opens with YAML frontmatter that parses. [S]
- [ ] ⚙ `name` is 1–64 chars of `a-z`, `0-9`, `-`, with no leading, trailing or doubled hyphen. [S]
- [ ] ⚙ `name` equals the directory name. [S]
- [ ] ⚙ `description` is present and 1–1024 chars, measured after YAML folding. [S]
- [ ] `description` says both **what** the skill does and **when** to use it. [S]
- [ ] ⚙ `compatibility`, if present, is ≤ 500 chars. [S]
- [ ] ⚙ `metadata`, if present, maps string keys to **string** values (unquoted `1.0` or a bare date
      fails). [S]
- [ ] ⚙ File references are relative to the skill root and one level deep from `SKILL.md`. [S]

## `quality` — legal, but costs tokens, triggers badly or misleads

**Frontmatter**

- [ ] ⚙ Top-level keys outside the spec's six (`name`, `description`, `license`, `compatibility`,
      `metadata`, `allowed-tools`) are reported. A key one client reads (for example a Claude Code
      invocation flag) may stay, but only with a reason. Anything else goes in `metadata`. [S]
- [ ] ⚙ `allowed-tools`, if present, is a space-separated string, not a YAML list. The field is
      experimental, so a list is `quality`, not `spec`. [S]

**Budget**

- [ ] ⚙ `SKILL.md` is under 500 lines (warn past 400) and roughly 5,000 tokens. [S][BP]
- [ ] Long reference material sits in `references/`, and `SKILL.md` says **when** to read each
      file. [BP]

**Description and triggering** [D]

- [ ] Phrased around user intent in the words users type, not around how the skill works inside.
- [ ] Specific trigger contexts. Never "Helps with X".
- [ ] When a neighbouring skill shares keywords, it names what it is **not** for.
- [ ] Not padded with keywords copied from failed queries (overfitting).

**Content** [BP]

- [ ] Every line passes _"would the agent get this wrong without it?"_ Nothing restates the spec,
      tool docs, general knowledge, or always-on context (`AGENTS.md`, `CLAUDE.md`) — the delta
      rule.
- [ ] One coherent unit of work: not so narrow that one task loads several skills, not so broad
      that it triggers imprecisely. No large overlap with another installed skill.
- [ ] Gives a default and the condition for each alternative, not a menu of equal options.
- [ ] Steps are actionable. Fragile steps carry exact commands, variable ones carry judgement.
- [ ] Has a **Gotchas** section, or equivalent, holding the corrections real runs needed.
- [ ] Multi-step or destructive workflows have a checklist or a validate-then-execute loop.
- [ ] Examples, or an output template where output is structured.

**Scripts** [SC] (skip when there is no `scripts/`)

- [ ] Every script is listed in `SKILL.md` and called by its relative path.
- [ ] No interactive prompts. Input comes from flags, env vars or stdin.
- [ ] `--help` works. Errors say what went wrong and what to try. Exit codes are documented.
- [ ] Data goes to stdout and diagnostics to stderr. Large output is summarized or limited.
- [ ] Destructive actions need a flag (`--force`, `--confirm`) or offer `--dry-run`.
- [ ] Dependencies are pinned or stated (`compatibility`, or a prerequisites line).

**Portability** (skip for a skill that only ever runs in its own repo)

- [ ] ⚙ No link escapes the skill directory (`../`) unless marked optional. It is dead once the
      skill is installed elsewhere.
- [ ] Repo-specific conventions are fenced under their own heading, skippable when absent.
- [ ] Hard environment requirements are in `compatibility`.

## `nit` — wording or tidiness

- [ ] Headings and anchors that other files link to still exist.
- [ ] Consistent terminology. One name per concept.
- [ ] Tables and code blocks render. No stray HTML.
- [ ] `metadata.version` bumped when the skill changed meaningfully.

## OpenThrottle repos only

Skip when `skills/` and `.agents/skills/` are absent.

- [ ] `quality` — An owned skill lives in `skills/<name>/`, never hand-written in `.agents/skills/`
      or `.claude/skills/`.
- [ ] `quality` — The description follows the house shape: capability, `USE WHEN …`, then a
      "Not for …" line naming the neighbour.
- [ ] `quality` — `bash skills/ot-skill-sync/scripts/sync.sh --check` is clean after the change.
- [ ] `nit` — Listed in `docs/Skills.md` and the root `AGENTS.md` skill list.
- [ ] Vendored (a real directory in `.agents/skills/` tracked by `skills-lock.json`): **report
      only**. Never edit it, and never stamp `last-reviewed` on it.
