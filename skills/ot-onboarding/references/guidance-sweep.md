# Sweep for guidance that contradicts the OT-only rule

**Search.** Grep the agent-facing guidance for instructions to put a plan on disk:

```bash
grep -rniE 'plans/NNN|plans/README\.md|write (the |a )?(plan|prd|spec)|plan file|docs/plans|(plan|prd|spec|task list)[^.]{0,40}\.md' \
  skills/ .agents/ AGENTS.md CLAUDE.md docs/ 2>/dev/null \
  | grep -viE "never|not as|instead of|do not|don't|rather than|fail loudly"
```

That negative filter matters: without it the hits that _state_ the rule drown out the ones that
break it. Even so, expect roughly fifty hits in this repo and **triage before reporting** — this
skill's own file, `ot-plans`, and the `docs/openthrottle/*` guides all mention plans and Markdown in
the same breath while saying the right thing. A hit only counts if it tells an agent to _put a plan
on disk_. Sweep your own memory/rules store the same way — and remember `.agents/skills/` holds
**external** skills installed via `npx skills add`, which are the likeliest offenders because nobody
here wrote them.

**Report.** Show the user **every** hit as `file:line` with the offending text quoted. Never edit
anything found this way before showing it. What a real hit looks like: an external skill that
instructs writing plans to `plans/NNN-short-slug.md` with a `plans/README.md` index — directly
against the rule. (The vendored `improve` skill did exactly this until it was uninstalled.)
