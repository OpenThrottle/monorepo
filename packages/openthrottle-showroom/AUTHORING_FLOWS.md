# Authoring a flow

Four flows shipped before this file existed — `01-what-is-openthrottle`,
`03-first-plan`, `05-connect-ot-mcp`, `21-dashboard-tour` — and between them they
had already settled most of the questions a fifth author would ask. They settled
them in comments, though, which is why two of them had drifted by the time the
flow gate landed. This is those comments, promoted.

Every rule below cites the flow that taught it. If a rule has no citation it is
not a rule yet.

Start from [`src/episodes/_template/flow.ts`](src/episodes/_template/flow.ts) and
delete what you do not need. Read [`RECORDABILITY.md`](RECORDABILITY.md) for your
episode first — several beats that look ordinary are not recordable, and the
audit says which.

---

## The one rule everything else serves

**A flow transcribes its episode's beats. It does not interpret them.**

`AGENTS.md` states it and the package means it: the beat's `action` field is the
literal flow step. If your flow needs a step the episode does not describe, the
**episode** is what is wrong — go and change it, and change the narration that
went with it. Adding the step quietly is how a video ends up demonstrating
something its own script never claimed.

Two mechanical consequences, both now enforced by
[`src/episodes/__tests__/flows.test.ts`](src/episodes/__tests__/flows.test.ts):

- **Your flow declares exactly one beat fewer than the episode.** The missing one
  is the outro card, which every episode ends on and which
  `assemble/master.ts` appends rather than records ("identical on every video,
  appended rather than composited").
- **`planTimeline` budgets narration per beat BY INDEX.** Fold two declared beats
  into one flow beat and every beat after it is held for the wrong duration.
  21-dashboard-tour did exactly that with its activity-panel beat and nobody
  noticed until the gate.

## Frame 1 shows the thing the title promises

01's opening comment: it opens on a plan that is already in progress with output
already streamed, because that is what "What is OpenThrottle in 60 seconds"
promises. 03 opens on a populated plans list rather than the create form, and
says why — "the payoff … not an empty state". 05 goes further and spends its
first 150ms on a prompt that is already typing, because the publish checklist
wants the opening seconds to carry something.

So the first two steps of your flow are `navigate` + `waitFor` on the payoff,
and the dwell after them is short. An empty state or a spinner in frame 1 is a
video nobody watches to frame 2.

## `portraitStrategy` is a content decision, not taste

`crop` (the default) follows the per-beat region of interest. `fit` scales the
whole frame to portrait width and letterboxes it.

- **`fit` when the content is WIDER than the crop window** — a table, a full-page
  form, a whole dashboard. 03 and 21 both set it, with 03 carrying the reason:
  cropping those "clips text at both edges and no choice of centre saves it".
  The cost is smaller text; the benefit is text that is whole.
- **`crop` when the subject is a field, a button or a single card.** 01 leaves
  the default. 05 sets it explicitly and explains the exception: a shell window
  is deliberately narrower than the viewport with type sized for a phone, so it
  crops well — and its one wide beat is handled by pointing that beat's region at
  the table instead of by changing the strategy for the whole video.

That last move is the general answer to "most of my beats want `crop` but one is
a table": keep `crop` and give the wide beat a region.

## Typing beats crop to the field, not the page

03 maps `type-title` to `#plan-title` and `type-description` to `#plan-summary`,
not to `[data-testid="PlanForm"]` — while its non-typing beats on the same page
do point at the form. The reason is in the file: a 1080-wide portrait frame of a
full-width form is unreadable text at 20% scale.

Rule: a beat whose subject is a value being entered crops to the input. A beat
whose subject is the form as a whole crops to the form.

## `waitFor` before `highlight`, after any transition

01's comment, learned the hard way: "at the portrait viewport the tab transition
briefly reports no box for the target". The same applies to anything that mounts
from a skeleton — 21's activity card does — and to any navigation.

The shape is always:

```ts
click('#plan-tab-overview', 'why-it-exists'),
waitFor('[data-testid="MarkdownRenderer"]'),
dwell(600),
highlight('[data-testid="MarkdownRenderer"]', 1_600),
```

A `highlight` on an element with no bounding box is a silently missing highlight,
and the beat's region of interest goes unsampled with it — which means the
portrait crop falls back to centre framing for that beat, which is the framing
the region existed to avoid.

## There is no `sleep`, and `dwell` is not a wait

Stated in `runner/types.ts` and worth repeating where flows get written: waits
are on app state (`waitFor`, `waitForUrl`), so a slow machine **stretches** the
recording instead of desynchronising it. `dwell` is the single intentional
pause and it is pacing for the narration.

If you find yourself reaching for a longer `dwell` because something is not
ready yet, you want a `waitFor`.

## Comment every step with its beat time

All four flows do it — `// 0:24 — save, land on the new plan.` — and it is what
makes drift visible in review. A reviewer can read the flow next to the episode
and see, without running anything, that the beat at 0:24 is the beat the flow
says it is. It is also the only place a _reason_ fits: 03's category beat carries
"not in the first draft of the script: the app requires it and has no default, so
the script gained a beat rather than the flow pretending the field is not there",
which is the whole argument for that beat existing.

## Selectors are shared with the E2E suite

`AGENTS.md`: a demo video is structurally an E2E flow, and both suites must drive
the same test hooks so the app never grows two parallel sets. 03's header names
the hooks it shares with Maestro.

[`selectors.test.ts`](src/episodes/__tests__/selectors.test.ts) fails on a
`data-testid` the app no longer renders — but it only sees `data-testid`
selectors. An `aria-label` or text selector passes it vacuously, so reaching for
one is a decision to give up the guard. Two controls need that decision made:
`PromoteTaskButton` and `KillPlanRunButton` carry no test id today (see
RECORDABILITY.md), and the right fix is one shared hook in the app, added for
both suites, rather than a text selector in the flow.

`#id` selectors are out of scope for that test on purpose — those address the
pipeline's own typeset surfaces, not the app.

## Beats whose subject is not the app

Some episodes are about a command line. Those beats run against a **typeset
surface**: a self-contained HTML document that `stage` puts on camera and the
same `type` / `press` / `highlight` / `reveal` verbs drive.

05 is the worked example and it is worth reading whole. What it settles:

- **Build surfaces with the helpers in `src/surfaces/`. Never hand-write HTML in
  a flow.** The type says so and 05 obeys it, keeping its document in
  `05-connect-ot-mcp/surface.ts` beside the flow.
- **Every path and prompt is a parameter**, so the frame shows a fictional
  machine by construction (`DEMO_MACHINE`) rather than by remembering to clean
  one up.
- **`reveal` is how "the printed block appears" is one step** rather than a
  second near-identical surface. Hidden elements are `display: none`, so they are
  absent from the beat's text dump — and therefore from the leak scan — until the
  beat that actually shows them.
- **Output that comes from a real command is captured, not retyped.**
  `05-connect-ot-mcp/mcp-instructions.txt` is the verbatim output of its
  generator, with a test that fails if the generator stops producing it. Do the
  same for `setup.sh`, `worktree:new` and `compose up` output.
- **A `reveal` is not automatically a beat.** 05's printed block is deliberately
  not one, with the reason in the file. Beats are declared by the episode; steps
  are how you get through them.

## Mutating flows

03 creates a plan on camera, and four more flows will create a rule, a note, a
scheduled job and a promoted plan. The demo **seed** is idempotent; a **flow** is
not — take 1 leaves the row behind and take 2 films a list that already contains
it.

The convention, so you do not solve it per flow: **set `mutates: true` on the
flow**. `run.ts` then refuses to record it against a workspace it has already
filmed since the last seed, names both timestamps, and prints the re-seed
command. `--allow-dirty` overrides it, for when you have reset the workspace by
a route the check cannot see.

Absent means read-only, and that is the safe default in the right direction: a
read-only flow wrongly marked mutating costs a re-seed, while a mutating flow
left unmarked costs a take. If your flow types into a form and saves, mark it.

Full reasoning — including why this beat stamping the created row's title, which
is on camera, and rolling back after the take, which the crashing take skips —
is in [`src/runner/dirty.ts`](src/runner/dirty.ts) and
[`PIPELINE.md`](PIPELINE.md).

## Flows that film a run in progress

The seed coerces every run to `COMPLETED`, because an `IN_PROGRESS` run with no
heartbeat is swept stale within two minutes and the plan reconciles back to
`PENDING` — so take 1 and take 7 would disagree on the badge.

A flow that needs the opposite declares it:

```ts
liveRun: { runId: DEMO_LIVE_RUN_ID, taskId: '…' },
```

`run.ts` then starts `src/scripts/demo-live-run.ts` alongside the take. It stamps
a real heartbeat every 15s, so the sweep leaves that one run alone and every
other run keeps the seeded rule; on the way out it settles the run back to
`COMPLETED`. If your flow _kills_ the run on camera, the heartbeat notices the
terminal status, stops, and leaves the status the frame just showed.

Nothing is faked: the run really is in progress, and the app is reacting to a
real heartbeat rather than to a demo-only branch in the sweep.

## Before you call a flow done

- `pnpm nx run @openthrottle/openthrottle-showroom:test` — the gate checks beat
  counts, region keys and test ids without recording anything.
- Record it twice and diff the manifests. A flow that needs two attempts has a
  race in it; fix the race rather than remembering the retry.
- `video-scan` the take. Imported snapshot rows carry real free text by design,
  so a human reads the frames before anything is published — that is part of this
  pipeline, not a nicety.
