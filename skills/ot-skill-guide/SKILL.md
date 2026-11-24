---
name: ot-skill-guide
description: >-
  Author and review Agent Skills (a folder with a SKILL.md) against the agentskills.io
  specification and its best-practice guides. USE WHEN creating or writing a new skill, editing or
  restructuring a SKILL.md or its frontmatter, fixing a skill description that does not trigger, a
  skill has grown too long, or asked to review, audit or grade existing skills, including the
  rolling skill review. Works in any repository. Not for installing or syncing skills into agent
  folders (ot-skill-sync).
metadata:
  author: openthrottle
  last-reviewed: '2026-11-22'
  version: '1.2.0'
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

Every review checks these, so they are listed here; wording and edge cases are in the spec.

- A skill is a directory holding `SKILL.md`: YAML frontmatter, then a Markdown body.
- `name` is required: 1–64 chars, `a-z`, `0-9` and `-`, no leading, trailing or doubled hyphen,
  and equal to the directory name.
- `description` is required: 1–1024 chars, says what it does and when to use it.
- Optional: `license`, `compatibility` (≤ 500 chars, only for real environment requirements),
  `metadata` (string keys to string values: quote versions and dates), `allowed-tools`
  (experimental, space-separated).
- Budget: `SKILL.md` under 500 lines and 5,000 tokens. Detail goes in `references/`, `scripts/` or
  `assets/`, linked by relative path, one level deep.

## Author mode

Work these in order. Each step is a place a skill commonly goes wrong.

1. **Check scope before writing.** List the skills already installed and read the context the agent
   always has (`AGENTS.md`, `CLAUDE.md`, rules files). If an existing skill covers most of it, extend
   that skill. If a rule belongs in always-on context, put it there. A skill is one coherent unit of
   work: too narrow and one task loads several skills, too broad and it triggers imprecisely.
2. **Ground it in real material**: transcripts of the task done well, runbooks, review comments,
   past failures. Generic advice is what the agent already knows.
3. **Write the description last, and test it.** It is the only text loaded before activation, so
   it carries all of the triggering, and every session pays for it whether or not the skill fires.
   It holds the capability, the user intents that should trigger it in the words users type, and a
   "Not for" clause naming the neighbouring skill that shares its keywords. Nothing else: behaviour,
   inventories and synonyms for the same trigger belong in the body. The limit is 1024; a
   description near it needs a reason. Never "Helps with X". Do not add keywords copied from failed
   queries.
4. **Keep only what the agent would get wrong.** Test each line: _would the agent fail without
   it?_ Judge that against the weakest model and driver that will run the skill (see
   [§ Model fit](#model-fit)). Do not restate the spec, the tool's docs, or context the agent already
   has (the delta rule).
5. **Give a default, not a menu.** Name the one way to do it, and add an alternative only with the
   condition that selects it. Match specificity to fragility: exact commands for fragile steps,
   judgement for variable ones. State the target behaviour rather than the banned one; keep a
   prohibition only as a guardrail, paired with what to do instead.
6. **End each step on a checkable criterion.** "Every modified model accounted for" beats "produce a
   change list": a vague end invites the agent to stop early.
7. **Lay it out for progressive disclosure.** Keep the procedure, the checklist and a **Gotchas**
   section in `SKILL.md`. Move long reference material to `references/<topic>.md` and say _when_ to
   read each file. Put templates and data in `assets/`. When agents keep rewriting the same logic,
   move it to `scripts/`, following _Using scripts_. Do not open the body with a "when to use this
   skill" section: the body loads only after the description matched.
8. **Keep it portable.** A skill that may be installed in other repos must not assume this repo's
   paths, build tool or services. Read the host's own files first, fall back to defaults shipped in
   the skill, and state hard requirements in `compatibility`. Fence repo-specific conventions under
   their own heading so a foreign repo can skip them.
9. **Pick the invocation mode.** A model-invocable skill costs its description in every session. A
   skill only a human starts by name can be slash-only where the client supports it and costs no
   standing context.
10. **Validate, then revise from a real run.** Run the checks in [§ Validate](#validate), run the
    skill on a real task, read the trace for wasted steps, and do at least one revise pass. Trigger
    and with/without-skill evals: _Optimizing descriptions_ and _Evaluating skills_.

## Model fit

Skills are read by more than one model and driver. Write for the range.

- **Judge against the weakest reader.** "Would the agent get this wrong?" is answered for the least
  capable model or driver that runs the skill. Say in the PR which one it was judged on.
- **Do not strip for the strongest reader.** A line only the cheaper model needs stays, and says so.
- **A compensation carries its incident.** A line added because a run failed says, in a clause, what
  failed. A compensation with no known incident is a candidate to test, not to keep by default.
- **One statement per rule.** Repetition is not emphasis. Put the rule where it is acted on.
- **Mark only guardrails.** Caps and bold are for steps where a mistake is destructive or
  irreversible. Everything else is a plain sentence with its reason.
- **Re-test on a model change.** When the default model or a driver changes, re-run the skill's
  evals before editing prose, and cut only what they show is a no-op on every reader.

## Review mode

Use it for one skill, a named set, or the rolling review.

1. **Pick the targets.** For a rolling review, take the skills with the oldest
   `metadata.last-reviewed` (missing counts as oldest), default **3** per pass. See
   [§ Review bookkeeping](#review-bookkeeping).
2. **Classify each target** as **owned** (authored in this repo) or **vendored** (installed from
   upstream, e.g. listed in a `skills-lock.json`). Vendored skills are report-only: never edit them.
   A fix goes upstream, or into an owned skill layered on top.
3. **Run the mechanical checks** from [§ Validate](#validate) and record their output verbatim.
4. **Resolve everything the skill cites.** Run every command and script with `--help` or a dry run,
   and confirm every path, MCP tool, generator, lint rule and target exists. Reading a citation is
   not checking it.
5. **Read the skill against the checklist** in
   [`references/review-checklist.md`](references/review-checklist.md), with the always-on context
   beside it, because restating it is a finding.
6. **Run the cross-skill pass** whenever more than one skill is under review: pairs whose
   descriptions would match the same request, whether each names the other in "Not for", and
   whether a fact stated in two skills agrees.
7. **Grade every finding** on one scale:

   | Severity  | Meaning                                                        |
   | --------- | -------------------------------------------------------------- |
   | `spec`    | Violates the specification. Fix before anything else.          |
   | `quality` | Legal, but costs tokens, triggers badly or misleads. Fix next. |
   | `nit`     | Wording or tidiness. Batch these.                              |

8. **Report** with the template below. Each finding gives its evidence (file and line, or the check
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

An owned skill records its last review in its own frontmatter, as
`metadata.last-reviewed: 'YYYY-MM-DD'`. Set it when a review's fixes land, not when the review is
filed, so a date never claims a skill is clean while its findings are open. It is spec-legal,
travels with the skill into every repo, and git history verifies it. Vendored skills cannot be
stamped: record their review in the report or the tracker the findings go to.

## Validate

Run both before calling a skill done or a review complete:

- **Reference validator.** `skills-ref validate <skill-dir>` checks frontmatter and naming. It is
  not on PyPI: install it from a checkout of the repo linked above (`uv sync` or `pip install -e .`
  in `skills-ref/`), or let `uvx` fetch it if your environment allows fetching and running code.
- **Bundled check**: `bash scripts/check.sh [--quiet] <skill-dir | dir-of-skills>...`. It needs
  only bash and awk, with no network. It checks the spec rules, the line and token budget, unknown
  frontmatter keys, dead relative links and links that leave the skill, scripts `SKILL.md` never
  names, and prints `last-reviewed`. In OpenThrottle repos it also checks owned descriptions for the
  house shape. `--resolve-paths` lists cited repo paths that do not exist. It exits `1` on any `spec`
  finding, `0` when there are only `quality` warnings, and `2` on usage errors. See `--help`. When
  it and `skills-ref` disagree about frontmatter, trust `skills-ref`.

## Gotchas

- **Unquoted YAML scalars break `metadata`.** `version: 1.0` is a number and `date: 2026-11-14` is
  a date. The spec requires strings, so quote them.
- **A folded description (`>-`) still counts toward 1024.** The limit applies to the folded text.
- **A renamed directory must rename `name`**, and the reverse; some clients key on the directory.
- **A link that resolves in this repo can be dead in another.** Links outside the skill directory
  (`../../docs/…`) break once the skill is installed elsewhere. Link a URL, or say it is optional.
- **A non-spec top-level key needs its reason on the line above it**, as a `#` comment (a client
  invocation flag, say). `check.sh` accepts a commented key and warns on a bare one.
- **Reading a skill is not a review.** Line counts, description lengths and whether a cited path
  exists are where reviews by eye go wrong.

## In OpenThrottle repos

Skip this section when the files it names do not exist.

- Author owned skills in `skills/<name>/`. `.agents/skills/` and `.claude/skills/` are generated:
  run the `ot-skill-sync` skill after any add, rename or delete, and never edit them by hand.
- Frontmatter order is `name`, `description`, `compatibility`, then `metadata` with a lowercase
  `author` and a semver `version`.
- Descriptions follow the house shape: capability, `USE WHEN …` triggers, then a "Not for …"
  clause naming the neighbouring skill. Keep them slim: the spec's 1024 is a ceiling, not a target.
- `pnpm nx run monorepo:check-model-facing-text` (in `check:local` and CI) fails when a `SKILL.md`
  or its description grows past `scripts/model-facing-text.snapshot.json`. Accept deliberate growth
  with `-- --write` and say why in the PR.
- A workflow skill with a terminal outcome (it commits, opens a PR, finishes a run) reports it once,
  under an "In OpenThrottle repos" heading, with the one-liner the `github-commit` skill shows.
- Vendored skills are the real directories in `.agents/skills/` tracked by `skills-lock.json`.
  Install them with `npx skills add <owner>/<repo> --skill <name> --agent universal`, then sync.
- Review findings are filed as one follow-up plan in OpenThrottle, never as a Markdown file. The
  scheduled rolling review is the `Job_SkillReview` prompt in `.agents/prompts/`. Trigger and
  with/without-skill evals are being built on the OT eval core (plan 8f3addd4); until then use the
  agentskills.io manual method.
