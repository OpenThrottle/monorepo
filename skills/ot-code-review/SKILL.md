---
name: ot-code-review
description: >-
  Review an OpenThrottle change against its house conventions: where each file goes, whether new
  pieces match generator output, readability, naming in context, duplication that belongs in a
  package, and module boundaries. USE WHEN asked to check a diff, branch, PR or path against our
  conventions or patterns, before opening a PR, or at ot-loop Finishing. Not for correctness bugs or
  security (your agent's built-in review), scaffolding (ot-generators) or placing a file while
  writing it (ot-folders).
metadata:
  author: openthrottle
  last-reviewed: '2026-11-24'
  version: '0.1.0'
---

# ot-code-review

Review a change against what lint, typecheck and a bug-focused review cannot see. Five principles
plus boundaries, each with one lens:

1. **Place.** Every file has one right folder, name and shape.
2. **Exemplar.** A component, route, hook, NestJS service or package looks like what
   `@tools/generators` emits today.
3. **Humans.** Code is written for a reader.
4. **Naming.** Layout carries context, so names stay short: `plans/utils/format.ts`, not
   `plans/utils/plan-format-utils.ts`. Flag redundant names and vague ones.
5. **Duplication.** The same thing in two places belongs one rung up the promotion ladder, or in a
   package.
6. **Boundaries.** Deep imports, tags, the client/Node boundary, package entrypoints.

The rules live in root `AGENTS.md` § Code style, `docs/monorepo/code-style.md`, `ot-folders` and
`ot-generators`. The [catalog](references/catalog.md) says what to spot for each and links the
rule; this file is the procedure. It never reviews for correctness bugs or security: point at your
agent's built-in review for those, if it has one.

## Input

Default to the working diff (staged + unstaged + untracked) against the branch's merge-base. Other
inputs, by what the caller names:

| Caller names       | Review                                                               |
| ------------------ | -------------------------------------------------------------------- |
| nothing            | `git diff $(git merge-base HEAD origin/main)` plus untracked files   |
| a branch           | `git diff origin/main...<branch>`                                    |
| a PR number        | `gh pr diff <n>` (read-only: never check the PR out over your work)  |
| a path             | its files as if newly added, capped at one Nx project                |
| `--fix` (with any) | the same, then apply mechanical fixes only (see [§ Output](#output)) |

A repo-wide or whole-package sweep is not this skill: that is the `Job_RulesConformance` prompt in
`.agents/prompts/`. Review added and changed lines only; untouched legacy code is never a finding.
Code moved verbatim from another file, and an old problem on a line the diff only touched, go under
Out of scope: the diff did not introduce them.

## Procedure

1. **Gather the change.** List every added, changed, renamed and deleted file, and note which are
   **new** (the exemplar and duplication lenses start from those). Done when the file list is
   complete and each file is tagged new or changed.
2. **Run the machine checks first.** [references/machine-checks.md](references/machine-checks.md)
   maps what the diff touches to the checks to run: at least `pnpm exec eslint <changed files>`
   and `pnpm nx run <project>:typecheck` for each touched project, plus every row whose paths match.
   Run them sequentially (Nx targets share a cache), and keep only output on lines the diff added
   (its § Scoping output to the diff). Report their failures as they are and **do not re-read the
   diff for any rule they cover**. Done when each matching check ran and its diff-scoped output is
   recorded.
3. **Read the diff through each lens**, using the catalog section for it:
   - Place, Humans, Naming and Boundaries: [catalog](references/catalog.md) §§ 1, 3, 4 and 6.
   - Exemplar, for each new component, route, hook, service or package, and for any file the diff
     hand-adds to several pieces alike: [references/exemplar.md](references/exemplar.md). Dry-run
     the generator with a probe name and compare structure, never bytes.
   - Duplication, for each new exported function, hook, component or distinctive constant:
     [references/duplication.md](references/duplication.md). Grep by a literal from the new code
     first; open both copies and confirm the behavior matches before you call it a copy.

   Done when every lens has run over every file it applies to, even if it found nothing.

4. **Grade and report** in the format in [§ Output](#output). Drop any finding you cannot point at
   a line and a catalog id for: that is a hunch, not a finding.
5. **Close the loop.** For each finding class that fired more than once, or that a reader had to
   catch by eye, name its cheapest machine check from the catalog entry's machine-check path (a lint
   rule, a generator fix, an `audit:*` extension, or "stays honor system" with the reason). In
   OpenThrottle, file the worthwhile ones as a `follow-up` plan ([§ In OpenThrottle](#in-openthrottle)).
   This is the finish line: the report is delivered and every recurring class has a named path.

## Output

One line per finding, grouped by severity, `fix before PR` first. When one id fires in several
places for the same reason, give it one line and list the other locations in parentheses:

```markdown
- `path/to/file.ts:42` · place-03 · **fix before PR** · `utils/` file exports a component →
  move it to `components/` ([rule](link))
```

- **Severity** is the catalog's: `fix before PR` or `suggestion`. It is advisory, never a CI gate:
  "fix before PR" means the author fixes it before the PR opens.
- **A reverse finding** says "update the generator" when the hand-written piece is better than the
  template ([references/exemplar.md § 4](references/exemplar.md#4-the-reverse-finding)).
- **Out of scope** (a pre-existing problem, a larger refactor): list it under its own heading as a
  follow-up, never a change to this diff.
- End with one line per lens that found nothing ("Naming: clean"), so the reader can tell a clean
  lens from a skipped one.
- If your agent has a structured findings tool, report through it as well; the markdown above is
  the default every agent can produce.

**Read-only by default.** With `--fix`, apply only mechanical fixes: a rename, a move, swapping a
hand-rolled helper for the existing import. Never change logic or behavior, and re-run step 2's
checks after fixing. Everything else stays a reported finding.

## Gotchas

- **Lint warnings exit 0.** `pre-hooks-unpack`, `explicit-module-boundary-types` and
  `route-primitive-shape` only warn; a green lint run can still carry findings.
- **`code-style.md` labels lag the config.** `simple-import-sort`, `prefer-const` and `no-var` are
  `error` in the resolved config although the doc still calls them Warned or honor system. Trust
  `eslint --print-config` over the label.
- **A dry-run with the real name prints only `SKIPPED`.** Generators never clobber, so use a probe
  name in the real folder, and read the template tree for contents: a dry-run lists paths only.
- **OT `semantic_search` returns no code today.** It indexes plans, tasks and docs. Grep finds
  copies; semantic search only finds the plan that discussed the work.
- **Names alike are not copies.** Grep by name is noisy (26 false positives in one measured case);
  a distinctive literal is the strongest signal.
- **A first duplicate with no home is a suggestion.** Promote when the second consumer appears, not
  before. One use stays where it is.
- **Resource routes have no template.** The route generator picks its loader-only template only for
  an `api.` name, so a `resources.*` route is compared with its siblings, not the generator
  ([references/exemplar.md](references/exemplar.md)).
- **`audit:templates-compliance` flags JSX-free `.tsx` files** (resource routes) as missing the React
  import. That is the audit's false positive, not a finding.

## In OpenThrottle

Skip this section when the files it names do not exist.

- **Inside `ot-loop`**, this runs at § Finishing step 2, after the full gate and before the squash.
  `ot-loop` owns what follows: each `fix before PR` finding becomes a task in the plan, worked and
  committed like any other, then this review runs once more.
- **Follow-ups** are one `PENDING` OT plan tagged `follow-up` (`ot-plans` § Follow-ups), with the
  finding lines as evidence; never a Markdown file.
- **Report the outcome once** at step 5, or when the review is called off (`abandoned`) or cannot
  run (`error`). It writes no tracked file, so a read-only review still reports:

  ```bash
  r="$(command -v skill-usage-outcome.cjs || echo "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/openthrottle/bin/skill-usage-outcome.cjs")"; if [ -f "$r" ]; then node "$r" --skill ot-code-review --outcome success; fi
  ```
