---
description: >-
  Author and review Agent Skills (a folder with a SKILL.md) against the agentskills.io
  specification and its best-practice guides. USE WHEN creating or writing a new skill, editing or
  restructuring a SKILL.md or its frontmatter, writing or fixing a skill description that does not
  trigger, a skill has grown too long, or asked to review, audit or grade one or more existing
  skills, including the rolling skill review. Works in any repository; not for installing or
  syncing skills into agent folders.
metadata:
  author: openthrottle
  last-reviewed: '2026-11-15'
  version: '1.1.1'
name: ot-skill-guide
---

# ot-skill-guide

Write skills that load cheaply, trigger on the right requests and say only what the agent would
otherwise get wrong. Review existing ones against the same bar.

**The specification is the source of truth, not this file.** When a rule here and the spec
disagree, the spec wins. Fix this file. Read the source page whenever a decision turns on it:

| Page                                                                                     | Read it for                                       |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [Specification](https://agentskills.io/specification)                                    | layout, frontmatter fields, limits                |
| [Best practices](https://agentskills.io/skill-creation/best-practices)                   | scope, what to cut, gotchas, defaults over menus  |
| [Optimizing descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) | trigger wording, a trigger eval set               |
| [Evaluating skills](https://agentskills.io/skill-creation/evaluating-skills)             | with/without-skill output evals, `evals/`         |
| [Using scripts](https://agentskills.io/skill-creation/using-scripts)                     | bundled scripts: no prompts, `--help`, exit codes |
| [`skills-ref`](https://github.com/agentskills/agentskills/tree/main/skills-ref)          | the reference validator                           |

## The hard constraints

Restated only because every review checks them. Wording and edge cases: the specification.

- A skill is a directory holding `SKILL.md`: YAML frontmatter, then a Markdown body.
- `name` is required: 1–64 chars, `a-z`, `0-9` and `-`, no leading, trailing or doubled hyphen,
  and **equal to the directory name**.
- `description` is required: 1–1024 chars, says **what it does and when to use it**.
- Optional: `license`, `compatibility` (≤ 500 chars, only for real environment requirements),
  `metadata` (string keys to **string** values: quote versions and dates), `allowed-tools`
  (experimental, space-separated).
- Budget: `SKILL.md` under **500 lines and 5,000 tokens**. Detail goes in `references/`,
  `scripts/` or `assets/`, linked by relative path, **one level deep**.

## Author mode

Work these in order. Each step is a place a skill commonly goes wrong.

1. **Check scope before writing.** List the skills already installed and read the context the agent
   always has (`AGENTS.md`, `CLAUDE.md`, rules files). If an existing skill covers most of it, extend
   that skill. If a rule belongs in always-on context, put it there. A skill is one coherent unit of
   work. Too narrow and one task loads several skills. Too broad and it triggers imprecisely.
2. **Ground it in real material**: transcripts of the task done well, runbooks, review comments,
   past failures. Do not write from generic advice. Generic advice is what the agent already knows.
3. **Write the description last, and test it.** It is the only text loaded before activation, so
   it carries all of the triggering. Give the capability, then the user intents that should
   trigger it, in the words users actually type. Name the near-miss requests it is **not** for when
   a neighbouring skill shares its keywords. Never "Helps with X". For a skill that matters, run the
   ~20-query trigger eval in _Optimizing descriptions_. Do not add keywords copied from failed
   queries.
4. **Keep only what the agent would get wrong.** Test each line: _would the agent fail without
   it?_ If not, cut it. Do not restate the spec, the language, the tool's docs, or context the agent
   already has (the delta rule).
5. **Give a default, not a menu.** Name the one way to do it, and add an alternative only with the
   condition that selects it. Match specificity to fragility: exact commands for fragile steps,
   judgement for variable ones.
6. **Lay it out for progressive disclosure.** Keep the procedure, the checklist and a **Gotchas**
   section in `SKILL.md`. Move long reference material to `references/<topic>.md`, and say _when_ to
   read each file ("read `references/errors.md` if the API returns non-200"). Put templates and data
   in `assets/`. When agents keep rewriting the same logic, move it to `scripts/`, following
   _Using scripts_ (no interactive prompts, `--help`, errors that say what to try, data to stdout and
   diagnostics to stderr, documented exit codes).
7. **Keep it portable.** A skill that may be installed in other repos must not assume this repo's
   paths, build tool or services. Read the host's own files first, fall back to defaults shipped in
   the skill, and state hard requirements in `compatibility`. Fence off repo-specific conventions
   under their own heading so a foreign repo can skip them.
8. **Validate, then revise from a real run.** Run the checks in [§ Validate](#validate). Then run the
   skill on a real task, read the execution trace (not just the output) for wasted steps, and do at
   least one revise pass. For output quality, use the with-skill vs without-skill loop in
   _Evaluating skills_. Where the harness has Anthropic's `skill-creator`, it can drive that loop.
   This skill does not depend on it.

## Review mode

Use it for one skill, a named set, or the rolling review.

1. **Pick the targets.** For a rolling review, take the skills with the oldest
   `metadata.last-reviewed` (missing counts as oldest), default **3** per pass. See
   [§ Review bookkeeping](#review-bookkeeping).
2. **Classify each target** as **owned** (authored in this repo) or **vendored** (installed from
   upstream, e.g. listed in a `skills-lock.json` or installed by `npx skills add`). Vendored skills
   are **report-only**: never edit them. A fix goes upstream, or into an owned skill layered on top.
3. **Run the mechanical checks** from [§ Validate](#validate) and record their output verbatim.
4. **Read the skill against the checklist** in
   [`references/review-checklist.md`](references/review-checklist.md). Also read the always-on
   context, because restating it is a finding.
5. **Grade every finding** on one scale:

   | Severity  | Meaning                                                        |
   | --------- | -------------------------------------------------------------- |
   | `spec`    | Violates the specification. Fix before anything else.          |
   | `quality` | Legal, but costs tokens, triggers badly or misleads. Fix next. |
   | `nit`     | Wording or tidiness. Batch these.                              |

6. **Report** with the template below. Each finding gives its evidence (file and line, or the check
   output) and a concrete fix. A finding with no evidence is a hunch: drop it. Reviewing is not
   fixing. Hand the fixes on as tracked work unless the user asked you to fix them now.

```markdown
## <skill-name> — <owned|vendored> — <N spec, N quality, N nit>

| Severity | Finding | Evidence | Fix |
| -------- | ------- | -------- | --- |

Lines: <n>/500 · Description: <n>/1024 chars · Last reviewed: <date|never>
```

A clean skill still gets its header line, so the report shows it was reviewed.

## Review bookkeeping

**Decision: an owned skill records its last review in its own frontmatter**, as
`metadata.last-reviewed: 'YYYY-MM-DD'`. Set it when a review's fixes land, not when the review is
filed. Why:

- It is spec-legal (`metadata` is a string map) and travels with the skill into every repo that
  installs it, so the rolling review needs no database, service or extra file.
- Git history verifies it, and the review-and-fix commit is where the next reviewer looks.
- Stamping only when fixes land means a date never claims a skill is clean when its findings are
  still open.

Vendored skills cannot be stamped, because that would edit them. Record their review in the report
or the tracker the findings go to.

## Validate

Run both before calling a skill done or a review complete:

- **Reference validator.** `skills-ref validate <skill-dir>` checks frontmatter and naming. It is
  not on PyPI. Install it from a checkout of the repo linked above (`uv sync` or
  `pip install -e .` in `skills-ref/`), or let `uvx` fetch it from that repo if your environment
  allows fetching and running code. Its README calls it a demonstration tool, not a dependency.
- **Bundled check**: `bash scripts/check.sh [--quiet] <skill-dir | dir-of-skills>...`. It needs
  only bash and awk, with no network. It checks the spec rules, the line and token budget, unknown
  frontmatter keys, dead relative links and links that leave the skill, and prints `last-reviewed`.
  It exits `1` on any `spec` finding, `0` when there are only `quality` warnings, and `2` on usage
  errors. See `--help`. Its YAML reading is deliberately simple, so when it and `skills-ref`
  disagree about frontmatter, trust `skills-ref`.

## Gotchas

- **Unquoted YAML scalars break `metadata`.** `version: 1.0` is a number and `date: 2026-11-14` is
  a date. The spec requires strings, so quote them.
- **A folded description (`>-`) still counts toward 1024.** The limit applies to the folded text,
  not to one source line.
- **A renamed directory must rename `name`**, and the reverse. The spec requires them to match, and
  some clients key on the directory.
- **A link that resolves in this repo can be dead in another.** Links outside the skill directory
  (`../../docs/…`) break once the skill is installed elsewhere. Link a URL, or say the file is
  optional.
- **Reading a skill is not a review.** Run the checks: line counts and description lengths are
  where reviews by eye go wrong.

## In OpenThrottle repos

Skip this section when the files it names do not exist.

- Author owned skills in `skills/<name>/`. `.agents/skills/` and `.claude/skills/` are generated:
  run the `ot-skill-sync` skill after any add, rename or delete, and never edit those directories by
  hand.
- Descriptions follow the house shape: capability, then `USE WHEN …` triggers, then a "Not for …"
  line naming the neighbouring skill.
- Vendored skills are the real directories in `.agents/skills/` tracked by `skills-lock.json`.
- Install vendored skills with `npx skills add <owner>/<repo> --skill <name> --agent universal`
  (lands only in `.agents/skills/`), then run `ot-skill-sync`.
- Review findings are filed as one follow-up plan in OpenThrottle, never as a Markdown file. The
  scheduled rolling review is the `Job_SkillReview` prompt in `.agents/prompts/`.
