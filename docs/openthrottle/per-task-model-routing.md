# Per-task model routing policy

Which model a task gets, and why. The machine-readable policy is
[`skills/ot-loop/references/model-routing.json`](../../skills/ot-loop/references/model-routing.json);
this page is the rationale and the measurements behind it. How the resulting model reaches the work
ledger is a separate concern: [per-task-model-attribution.md](./per-task-model-attribution.md).

Decided for OT plan `fbd66137-3ffa-417a-829f-6d92f1249d8e` task 3.

## Read the cost column correctly

Every axis in CLAUDE.md's model table is a ranking where **higher = better for the owner**. For
cost that means **higher = cheaper**:

| model    | cost               | intelligence | taste |
| -------- | ------------------ | ------------ | ----- |
| sonnet-5 | 5 (cheapest)       | 5            | 7     |
| opus-4.8 | 4                  | 7            | 8     |
| fable-5  | 2 (most expensive) | 9            | 9     |

This has been read backwards once with real consequences: ~10 fable subagents were fanned out over
~60 mechanical component conformances (OT `0f0528ff`) and exhausted the org's **monthly** spend cap
mid-run, because `cost: 2` was read as "cheap". The most expensive model was selected for the most
mechanical job, and then multiplied. The warning is repeated verbatim in the policy file so it is
in front of whoever is about to escalate.

## Two sources of truth, deliberately separated

There is no second source of truth here, because the two files answer different questions:

- **CLAUDE.md** owns _what each model is_ — the cost/intelligence/taste ranking and the standing
  guidance ("bulk/mechanical work → sonnet-5", "user-facing needs taste ≥ 7", "never use Haiku").
- **`model-routing.json`** owns _which model a task gets_ — the category → tier mapping.

The policy file restates the axes only as data copied from CLAUDE.md for the router's use, and says
so. Change a model's ranking in CLAUDE.md; change a category's routing in the JSON.

## What the routing key actually looks like

The plan's premise was that `tasks.category` "maps almost 1:1 onto CLAUDE.md's model table". That
is true of the single plan originally sampled and **not** true of the corpus. Measured against the
live database:

- **5,723 tasks**, 4,809 with a category (84%), 914 null (16%). Recent work is better: over the last
  60 days, 92.4% carry one.
- **141 distinct category values**, and `tasks.category` is plain `TEXT` with no CHECK constraint
  (migration 003), so it is free text by design.
- The distribution has no head to speak of — the largest single value is `feature` at 10.8%, and it
  takes 32 values to reach 88% coverage.
- The vocabulary mixes axes: work type (`feature`, `bug`, `refactor`, `chore`), domain (`frontend`,
  `backend`, `ui`, `server`, `database`, `monorepo`), lifecycle phase (`design`, `research`,
  `testing`, `documentation`, `verification`), project names (`openthrottle-developer`), and vague
  buckets (`general`, `improvement`, `product`). Synonyms are unmerged: `test`/`testing`,
  `docs`/`documentation`, `infra`/`infrastructure`.

**Most category values say nothing about difficulty.** `frontend` does not tell you whether the task
is a one-line class rename or a new design system. So the policy maps only the values that genuinely
signal difficulty and lets everything else fall to the default.

That is a real limit on reach, and it is worth stating plainly rather than discovering later:

| tier                              | tasks   | share    |
| --------------------------------- | ------- | -------- |
| default — category unmapped       | 3,368   | 58.9%    |
| default — explicitly mapped cheap | 1,260   | 22.0%    |
| default — no category at all      | 914     | 16.0%    |
| **escalate**                      | **181** | **3.2%** |

**96.8% of tasks route to sonnet-5, 3.2% to opus-4.8, and 0% are auto-routed to fable-5.**

The value of this policy is therefore not clever escalation — it is safely _demoting_ the ~97% of
work that is currently burning the full interactive session model. Today every task in an
interactive run executes on whatever the session happens to be (Opus, in practice), whether it is a
slug rename or an architecture decision. That is the cost being addressed.

## The tiers

**`default` → sonnet-5.** The cheapest model, and what any unrecognized or absent category gets.
CLAUDE.md calls bulk/mechanical clear-spec work "effectively free" on sonnet-5. Note that its taste
of 7 already meets CLAUDE.md's user-facing bar of "taste ≥ 7", so **user-facing work does not
require escalation on taste alone** — this is why `product`, `ui` and `frontend` are not escalated
despite being taste-sensitive. Escalating them would have quadrupled the escalation bucket
(`product` alone is 213 tasks) for no requirement anyone stated.

**`escalate` → opus-4.8.** For work whose specification is genuinely open — the task has to _decide_
something rather than implement something already decided. `design`, `research`, `investigation`,
`architecture`, `analysis`, `exploration`, `spike`. Intelligence 7 and taste 8 buy real judgment at
a cost still cheaper than fable-5. CLAUDE.md's tie-break rule (`intelligence > taste > cost` for
anything that ships) is what justifies paying more here at all.

**`review` → fable-5, never auto-routed.** CLAUDE.md does name fable-5 for reviews of
plans/implementations, so the tier exists and is named. But fable-5 is the most expensive model, so
**no category maps to it**. Reaching it requires a deliberate per-task decision by the orchestrator
or a human, and never applies to a batch. Automatic routing cannot select the most expensive model —
that property is the direct encoding of the `0f0528ff` incident, and the guardrails in task 5 build
on it rather than having to establish it.

## The fallback is the cheap tier, and that is the whole point

`unknownCategory` and `nullCategory` both resolve to `default`. With 141 free-text values and 16% of
tasks carrying none, the fallback is not an edge case — it is the majority path, covering 74.9% of
tasks on its own. So it has to be both safe and cheap.

A fallback that escalated would be strictly worse than no routing at all: it would spend _more_ than
today's behaviour on exactly the tasks the policy understands least. Defaulting cheap means an
unrecognized category can only ever cost less than the status quo, never more. The failure mode of
this policy is "a hard task got sonnet-5", which is visible in the work and recoverable by re-running
one task — not "the monthly cap is gone".

## Cost guardrails

Routing makes spawning expensive agents trivial, so the policy carries a `guardrails` block. Two of
them are structural and the rest are advisory, and the distinction matters more than the wording.

**Structural — enforced by the shape of things, not by remembering:**

- **At most 1 non-default-tier agent at a time.** `ot-loop` runs exactly one task at a time and
  delegates at most one subagent per task, so 1 is what the loop already is. Any change adding
  intra-task fan-out or parallel lanes (OT `c22e5ba1`, `1c0d627a`) must re-decide this number for
  non-default tiers explicitly rather than inheriting the cheap tier's concurrency.
- **Automatic routing can never select fable-5.** No category maps to the `review` tier, so the
  expensive path is absent from the lookup. This is the load-bearing guardrail — a reader who
  inverts the cost axis still cannot produce a fable fleet through routing.

**Advisory — prose a caller has to follow:** escalation is per task and never per fleet; split mixed
batches by difficulty instead of routing them at the hardest item's tier; finish a finite mechanical
tail in the main loop rather than re-spawning for it.

### Why advisory is acceptable, given prose already failed once

It is fair to object that the `0f0528ff` incident _was_ a prose failure, and that writing more prose
is a weak response. The difference is where the judgment sits.

That failure was a judgment call made from a human-readable table, and the judgment inverted the cost
axis. The common path is no longer a judgment call: it is a lookup in a data file, and the expensive
tier is not reachable from it. So prose now governs only the deliberate-escalation path — which
already requires someone to consciously override a default — rather than the default path taken
hundreds of times. The blast radius is a single task at the wrong tier, not a fleet.

That is also why the cap that carries the weight is the structural one. A written cap of "no more
than N expensive agents" would be exactly the kind of instruction that failed before.

## What this is not keyed on

**`task_tags` — rejected for v1.** Richer than `category`, but `task_tags.dimension` is
CHECK-constrained to `('domain', 'phase')` (migration 064, confirmed), so a routing dimension needs
a migration, and tags are sparse next to category's 84%. No migration is specified for task 4;
revisit only if category proves too coarse in practice.

**`tag_action_rules` — rejected.** It looks like the right engine and has a genuine
`ActionExecutorRegistry` extension seam, but its semantics are wrong, which was verified rather than
inherited: rules are fingerprinted one-application-per-`(rule, plan)`, and the executor states
plainly that _"Actions are NEVER undone — un-matching flips the ledger row to 'orphaned'"_. Model
routing is a decision that must be re-made fresh on every run of every plan. Tags are a reasonable
future _input_; that engine is the wrong _home_.
