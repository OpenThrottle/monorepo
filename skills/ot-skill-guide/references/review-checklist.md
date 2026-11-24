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
      invocation flag) may stay when the line above it is a `#` comment giving the reason; `check.sh`
      then reports it as info. Anything else goes in `metadata`. [S]
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
- [ ] Every clause is a trigger or a disambiguator. Behaviour, rules, inventories (lists of rule or
      flag names) and synonyms for one trigger belong in the body. Length alone is not a finding;
      the spec's 1024 is a ceiling, not a target.

**Content** [BP]

- [ ] Everything the skill cites exists and works (`check.sh --resolve-paths` lists repo paths
      that do not resolve; commands still need running): each command and script runs (`--help` or a dry
      run), each path, MCP tool, generator, lint rule and build target resolves. A stale citation
      is `quality` even when the prose around it is fine.
- [ ] Every line passes _"would the agent get this wrong without it?"_ Nothing restates the spec,
      tool docs, general knowledge, or always-on context (`AGENTS.md`, `CLAUDE.md`) — the delta
      rule.
- [ ] One coherent unit of work: not so narrow that one task loads several skills, not so broad
      that it triggers imprecisely. No large overlap with another installed skill.
- [ ] Gives a default and the condition for each alternative, not a menu of equal options.
- [ ] Steps are actionable. Fragile steps carry exact commands, variable ones carry judgement.
- [ ] Has a **Gotchas** section, or equivalent, holding the corrections real runs needed. A Gotchas
      section that only restates rules from earlier in the skill is a finding; so is a recorded
      incident (a review comment, a failed run, a session note) in the skill's area that it lacks.
- [ ] One statement per rule. A rule repeated for emphasis is a finding: keep the best-placed one.
- [ ] Caps directives and bold mark only guardrails (destructive or irreversible steps). A
      non-obvious rule carries its reason. Shouting without a reason is a `nit`, or `quality` when a
      real run shows the rule over-applied.
- [ ] A line kept for a past failure says what failed. Cut candidates are judged against the
      weakest model or driver that runs the skill, never the strongest.
- [ ] The body does not open by restating the description (a "When to use this skill" section).
- [ ] Multi-step or destructive workflows have a checklist or a validate-then-execute loop.
- [ ] Examples, or an output template where output is structured.

**Scripts** [SC] (skip when there is no `scripts/`)

- [ ] ⚙ Every script is named in `SKILL.md` (checked) and called by its relative path.
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

**Across skills** (run when reviewing more than one)

- [ ] Each pair whose descriptions would match the same request names the other in "Not for".
- [ ] A fact stated in two skills agrees in both. Disagreement is `quality` on both.

## `nit` — wording or tidiness

- [ ] Headings and anchors that other files link to still exist.
- [ ] Consistent terminology. One name per concept.
- [ ] Tables and code blocks render. No stray HTML.
- [ ] `metadata.version` bumped when the skill changed meaningfully.

## OpenThrottle repos only

Skip when `skills/` and `.agents/skills/` are absent.

- [ ] `quality` — An owned skill lives in `skills/<name>/`, never hand-written in `.agents/skills/`
      or `.claude/skills/`.
- [ ] ⚙ `quality` — The description follows the house shape: capability, `USE WHEN …`, then a
      "Not for …" line naming the neighbour. (`check.sh` checks both phrases are present, not
      that the neighbour named is the right one.)
- [ ] `quality` — `bash skills/ot-skill-sync/scripts/sync.sh --check` is clean after the change.
- [ ] `quality` — `pnpm nx run monorepo:check-model-facing-text` passes; growth was accepted with
      `-- --write` only on purpose.
- [ ] `quality` — OpenThrottle-only content (the telemetry outcome line included) sits under an
      "In OpenThrottle repos" heading in any skill that ships to other repos. The finish-line step
      points to it there.
- [ ] ⚙ `quality` — The skill reports its outcome or opts out with `outcome-telemetry: 'none'`
      (`pnpm nx run monorepo:check-skill-outcome-reporting`). An opt-out on a skill that has a
      finish line is a finding.
- [ ] `quality` — The report sits in the finish-line step, not a trailing section; it fires once
      per invocation (never per task or tool call) on every exit path, naming when to send `error`
      and `abandoned`; and it passes no `--duration-ms`.
- [ ] `quality` — Read the skill's `/skills` row. Reported outcomes far below invocations (1 in 19) means the report step is skipped or the finish line is unclear. Many `abandoned` means
      the description loads the skill for requests it does not serve. Quote the row's numbers as
      the evidence.
- [ ] `nit` — Listed in the `docs/Skills.md` catalog.
- [ ] ⚙ `nit` — Frontmatter in house order (`name`, `description`, `compatibility`, `metadata`),
      lowercase `author`, semver `version`.
- [ ] Vendored (a real directory in `.agents/skills/` tracked by `skills-lock.json`): **report
      only**. Never edit it, and never stamp `last-reviewed` on it.
