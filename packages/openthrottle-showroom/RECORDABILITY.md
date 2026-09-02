# Recordability audit — the 20 episodes without a `flow.ts`

Walked beat by beat against a **production build** (`openthrottle-developer:start`,
`react-router-serve` on the built output — not `nx dev`) pointed at
`openthrottle_demo` after `seed-demo.sh --reset`, logged in as
`ada@atlasworks.example`. Audited 2026-08-30 on
`openthrottle/loop-plan-showroom-flows`, stacked on the snapshot branch
(PR #457).

Three questions per beat, from the plan: **does the control exist**, **is there
data behind it at the framing the beat asks for**, **is it deterministic across
two takes**. Verdicts are `recordable`, `data-gap`, `app-gap`.

This file is the input to every flow authored under plan
`02393bbe-e62f-4749-8eda-402f27bca1ad`, and to the `production.blockedOn` edits
that came out of it. When a beat here disagrees with the episode module, the
episode module is the thing to change — a flow never invents picture.

---

## The finding that reorganises the whole plan: `FEATURE_BETA_PREVIEW`

`packages/react-router-auth/src/utils/middleware.ts` gates six route prefixes
behind a server env var:

```
const BETA_ROUTE_PREFIXES = ['/generators', '/ide', '/personas', '/profile', '/pull-requests', '/search'];
…
if (isBetaRoute && !isBetaEnabled) throw redirect('/dashboard');
```

So 07's existing `blockedOn` — _"The /search route is unreachable in a production
build (it redirects to /dashboard)"_ — describes the symptom correctly and the
cause wrongly. The route is reachable; it is **beta-gated**. Same gate hits
`/generators` (episode 20). Confirmed on the wire: `/search.data?q=…` returns a
`SingleFetchRedirect` to `/dashboard` with the flag off, and renders with it on.

Turning the flag on does not make either episode recordable, for two reasons
that are worse than the redirect:

1. **A beta banner is then on camera.** Every beta route renders
   `GlobalScreen beta`, whose literal text is _"This route is a beta feature and
   may not function as expected."_ A marketing video whose subject carries that
   banner is not a video we can publish.
2. **The flag also turns on the development login prefill** — the auth form
   arrives filled with `developer@openthrottle.ai`. PIPELINE.md is explicit that
   the prefill is development-only and not representative, which is why the
   runner types credentials. Recording with the flag on contradicts that.

So `FEATURE_BETA_PREVIEW` is how you _audit_ these routes. It is not how you
record them. Both affected episodes keep a `blockedOn` entry until the routes
leave beta.

## The second cross-cutting finding: search returns nothing, by design

`SearchResolver.search` embeds the query at request time:

```ts
const embedding = await embedQuery(query);
if (!embedding || embedding.length === 0) return { chunks: [] };
```

Its own GraphQL description says it _"Requires OpenThrottle Postgres and
embedding (OPENAI_API_KEY or Ollama)"_. With neither configured, `/search`
renders a working page with **zero results** — verified for both `rate limiting`
and `how did we handle retries` against a corpus of 31 plan and 170
documentation embeddings.

That makes every search beat doubly blocked: the route is beta-gated, and its
payoff is a live model call, which is exactly the non-determinism
`RECORDING_MODES.replay` exists to keep off camera.

And a third problem specific to notes: the embedding corpus is
`plan_embeddings` / `task_embeddings` / `documentation_embeddings`. **There is
no note embedding table at all.** A note cannot come back from search however
the flag and the provider are set, so 10's payoff beat is not a data gap that
more rows would fix.

The honest substitute, where the beat is really about _retrieval by id_ rather
than semantic search, is the **header commander** — the same one 21 already
uses. Root's `commander-search` action parses a task id out of the query and
redirects straight to `/plans/:planId/tasks/:taskId`. That is a real, ungated
app entry point, and it is what 13 beat 3 actually describes. It is **not** a
substitute for 07 or 10, whose subject is semantic retrieval itself.

---

## Per-episode verdicts

Only problem beats are listed. Every beat not named below is `recordable`
against the seeded snapshot.

### 02-one-command-boot — `recordable` (shell surface)

Every beat is a terminal except beats 5–6, which are the dashboard. Runs against
`surfaces/shell.ts` the way 05 does. Capture the real `setup.sh` and
`pnpm run start` output rather than retyping it, per the
`surfaces/mcp-instructions.txt` precedent.

### 03-first-plan — **app-gap, blocked**

Every beat drives a web form that no longer exists: **New plan**, the title and
description fields, **Create plan**, then **Add task** twice. The plan and task
create/edit routes were removed — plans and tasks are authored through the
OpenThrottle MCP from the editor, and the plans index deliberately offers no
create CTA. The flow that recorded these beats is retired with them. Re-script
the episode around an editor + MCP demo before recording.

### 04-mental-model — `recordable`

| beat                                 | verdict    | note                                                                                                                             |
| ------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 3 `/notes`, open a seeded note       | recordable | 4 hero notes present; the plan's "the snapshot has no notes" landmine is real for the _snapshot_ but the hero fixture covers it. |
| 4 `/projects`, open a seeded project | recordable | 3 projects (2 hero + 1 imported), so the index is not an index of one.                                                           |

### 06-prd-to-plan — **app-gap, blocked**

`/plans/upload-decompose` renders, and says so itself:

> Upload markdown, CSV, HTML, JSON, or Excel. After parsing **(stubbed here)**,
> review the proposed plan and tasks, then commit **once the ingest service is
> wired**.

Beats 3–6 (Decompose, proposed plan renders, edit/delete a task, Save) have no
implementation behind them. Not a drop-zone question and not a model question —
the ingest service does not exist. Do not author a flow.

### 07-semantic-search — **app-gap, blocked** (existing `blockedOn`, restated)

All seven beats depend on `/search` returning results. Beta-gated _and_
provider-dependent, per the two findings above. The existing `blockedOn` string
is replaced with one that names the cause rather than the symptom.

### 08-promote-task — **app-gap, blocked**

| beat                                      | verdict         | note                                                                                                                                                                                                                                                                                              |
| ----------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 scroll the long description             | recordable      | Longest snapshot task description is 5,222 chars — scrolls. Assert by shape, not by id.                                                                                                                                                                                                           |
| 2 **Promote to plan** in the task toolbar | app-gap (minor) | `PromoteTaskButton` and `PlanTaskToolbar` render **no `data-testid`**. A flow can only reach them by text or `aria-label`, which `selectors.test.ts` does not check — so the coupling it exists to guard would be silently absent. Needs one shared hook in the app, added for the E2E suite too. |
| 6 add one task to the new plan            | recordable      | Mutating — inherits the take-2 convention.                                                                                                                                                                                                                                                        |

### 09-tags-and-rules — **app-gap, blocked**, but only at the ends

| beat                                              | verdict                                   | note                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 add a tag; a rule fires; a toast shows          | app-gap                                   | Adding a tag to a plan is `PlanToolbarTags`, inside the toolbar the app does not render. When it returns: the seeded rule matches `breakdown`, not `needs-review`, so the flow must add the tag the rule actually matches or the beat is a lie — and rule dispatch is a BullMQ job, so `waitFor` the toast, never `dwell`. |
| 5 back to a plan; add the tag; the new rule fires | app-gap                                   | Same control.                                                                                                                                                                                                                                                                                                              |
| 6 hold on the rule-applications list              | recordable, **wrong surface in the beat** | `PlanRuleApplications` (`[data-testid="PlanRuleApplications"]`) lives on the **plan detail Output tab**, not on `/rules`. 5 applied rows exist, all on real plans. The beat must say plan detail.                                                                                                                          |
| 2 open the rule that just fired                   | recordable                                | Only detail route is `/rules/$ruleId/edit` — an edit form, not a read view. Honest, but the beat should say so.                                                                                                                                                                                                            |

### 10-notes — **app-gap, blocked** (payoff), rest recordable

| beat                                        | verdict | note                                                                                                                                                                             |
| ------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 `/notes/create`; type a title             | app-gap | The create form has **one field**: a `Content` textarea. There is no title input — the title is derived from the markdown heading. Beats 1 and 2 are two beats over one control. |
| 4–5 search the symptom; the note comes back | app-gap | Notes are not in the embedding corpus at all. No provider and no flag makes this beat true.                                                                                      |

Beats 0 and 3 are fine. The episode stays blocked because beats 4–5 are the
whole thesis of the video ("context your agents can actually find").

### 11-ralph-one-task — `data-gap`, waiting on the in-progress-run task

Beats 0 and 3 need a task `IN_PROGRESS` and a run that reads as live. Every
imported run is coerced to `COMPLETED` at load, deliberately. Blocked on task
`8dd502d0` of this plan, not on the app.

### 12-watch-run-live — `recordable` with one caveat

The hero run (19 output chunks) and the largest imported run (24) both scroll.
Beat 4 — "switch browser tabs and return; the stream is still current" — is the
risk: the runner's own notes say a page the browser considers hidden does not
run `requestAnimationFrame` reliably, which is why the synthetic cursor is
driven from Node. Verify that beat specifically before believing it.

### 13-plan-id-traceability — `recordable`, split across two groups

Beats 0–2 are a terminal (`git log`, zoom the footer, copy the id) → shell
surface. Beat 3 "paste into the dashboard search; the task opens" is the
**commander id-jump**, not `/search`, so it is ungated and deterministic.
Beats 4–6 are plain app navigation. The two halves compose into one flow.

### 14-scheduled-runs — mixed

| beat                                                 | verdict         | note                                                                                                                                                                     |
| ---------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 `/schedule`, one showing a last-run time           | app-gap (minor) | 10 jobs render, but the table columns are Status / Schedule Details / Driver·Model / Actions. There is no last-run column. Beat needs rewording to what the index shows. |
| 1 **New job**; pick a plan from the picker           | app-gap         | `/schedule/create` has no plan picker. A scheduled job takes a **Prompt**, a provider and a repository — not a plan. The beat describes a product that does not exist.   |
| 2 cron toolbar; human-readable summary updates       | recordable      | Presets + cron field present (`[data-testid="ScheduleForm"]`).                                                                                                           |
| 3 choose the repository checkout                     | recordable      | `[data-testid="ScheduleRepositoryField"]`; 1 repository, 1 checkout.                                                                                                     |
| 5 open a seeded past run → output and **token cost** | data-gap        | All 20 `scheduled_agent_job_runs` have `total_tokens` and `cost_usd` **NULL**. The run detail renders, the cost half of the beat does not.                               |

### 15-kill-runaway-run — **app-gap, blocked**

Two things stand between this episode and a take, and only one was foreseen. The
foreseen one is solved: `KillPlanRunButton` short-circuits to `null` unless a run
is active, and the live-run heartbeat above now provides one.

The unforeseen one is fatal: the plan toolbar the button lives in is not rendered
at all. Beats 2, 3 and 4 have no control behind them.

When the toolbar returns, one thing is still owed — `KillPlanRunButton` carries
no `data-testid`, only `aria-label="Kill plan run for <title>"`, so a flow
reaching it gives up the selector guard. Same hook problem as 08.

### 16-worktrees — **app-gap, blocked** (existing `blockedOn` confirmed)

Every beat is a terminal, and the episode's own `blockedOn` already says
worktree state is CLI-only. That is still true — no worktree surface exists in
the dashboard. Recordable as a pure shell episode if the season wants it that
way, but then the `blockedOn` is what makes it honest, not a bug.

### 17-chat-any-cli — mixed

Composer, model picker and sidebar all carry hooks
(`ChatComposer`, `ChatComposerToolbar-model-select`, `ChatModelPicker-rail`,
`ChatConversationSidebar`). 126 conversations with 390 messages are seeded, so
beat 5 is real. Beats 3–4 — "Send; the response streams in", twice — are a
**live CLI call**: non-deterministic in content and duration, and dependent on
which CLIs happen to be installed on the recording host. There is no replay seam
today that streams a seeded conversation at reading pace. Either build one or
rewrite the beats to open a completed thread.

### 18-ollama-local-models — **app-gap, blocked**

| beat                                            | verdict | note                                                                                                                                                                                                                                        |
| ----------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–1 `/settings/agents` with local Ollama models | app-gap | That page lists agent CLIs **detected on the server host** — real machine state, not the demo database. The audited host lists antigravity, claude, codex, cursor, gemini, grok, opencode. No Ollama. Nothing in the seed can put it there. |
| 4–5 the browser network panel                   | app-gap | Devtools. Playwright cannot put it in frame. Needs a typeset surface or a beat rewrite — and if the beat changes, the episode changes, not just the flow.                                                                                   |

Worth recording for its own sake: `/settings/agents` is **non-deterministic by
construction** — it shows installed versions and a "Last checked <timestamp>"
line. 21-dashboard-tour's final beat already points at
`[data-testid="SettingsAgentsTable"]`, so this affects a shipped flow too.

### 19-skills — `data-gap` on the last beat

| beat                                         | verdict    | note                                                                                                                                                                                                           |
| -------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–2 catalogue, detail, trigger description   | recordable | But note the catalogue is read from **the recording checkout's filesystem**, not the demo database. The video shows this repo's real skills; the seed cannot change that, and the leak review has to cover it. |
| 3–4 composer; the response follows the skill | app-gap    | Live model call, same as 17.                                                                                                                                                                                   |
| 5 availability rules on the skill            | data-gap   | `skill_availability_rules` is 0 rows and `/skills/availability` renders "No rules yet. Add a rule…" — the empty state this whole snapshot exists to keep off camera.                                           |

### 20-generators — **app-gap, blocked**

Beta-gated (banner on camera), and the beats do not match the app regardless:

| beat                                        | verdict | note                                                                                                       |
| ------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| 0 a freshly generated component file open   | app-gap | An editor, not the app.                                                                                    |
| 2 "the option form renders"                 | app-gap | `/generators/react-router` renders Documentation / Presets / Schema / Debug tabs. There is no option form. |
| 3 fill in app, folder, component name       | app-gap | No such fields.                                                                                            |
| 4 "Run it; the created file paths list out" | app-gap | No run control. The page's own copy: _"Run Nx from your clone of OpenThrottle"_.                           |

The suspicion in the plan description was right to be a suspicion. The route
exists; the product in the script does not.

### 22-self-host-docker-compose — `recordable` (shell surface)

Compose file, `compose up`, health checks, dashboard on the served port. Capture
the real output.

### L1-idea-to-shipped-commit — blocked by composition

21 beats. Beat 6 (decompose over MCP), beats 9–13 (live run with a failing
validation and a fix) and beat 17 (token usage and cost) inherit the in-progress
-run and live-call gaps above; beat 17 additionally hits the NULL cost columns.
Deliberately last, and not authorable until the shorts it summarises are.

### L2-setup-from-scratch — `recordable` (shell surface), one caveat

Beat 10 — "the login form is prefilled; submit" — is only true in development.
The recording configuration types credentials. Either the beat is a development
beat and says so, or it types.

---

## The third cross-cutting finding: the plan toolbar is not rendered

Found while proving the live-run heartbeat, and it is the largest single blocker
in the season.
`applications/openthrottle-developer/app/routing/plans/components/PlanDetailRoute.tsx`
has:

```ts
const showConfiguration = false;
const showToolbar = false;
```

Both hard-coded, landed 2026-08-28 in #452. `PlanToolbar` — and with it **Kill
run**, the run/queue status action, the editor deep links and `PlanToolbarTags` —
is therefore absent from the plan detail page.

`TaskDetailRoute.tsx` carries the **same switch**, at line 60, so `PlanTaskToolbar`
and its **Promote to plan** button are absent from task detail too. The `addPlanTag` action still
exists on the route, so these are hidden controls rather than removed features,
but a flow cannot click a control that does not render.

Four more episodes are blocked by this, on top of the nine above:

- **08-promote-task** — beat 2 is **Promote to plan** in the task toolbar, and
  beats 3 through 6 all follow from that click. Everything else about the episode
  (a task with a description long enough to scroll, the link back to the parent
  plan) is fine.

- **15-kill-runaway-run** — beats 2, 3 and 4 are the toolbar, its disabled state
  and its return. The whole episode is that toolbar.
- **09-tags-and-rules** — beats 0 and 5 add a tag to a plan, which is
  `PlanToolbarTags`. Everything between them (`/rules`, the rule form, the
  applications list) works.
- **L1** — beat 9 starts a run from the plan.

11-ralph-one-task and 12-watch-run-live survive it, because neither touches the
toolbar: they open on a plan that is already running and read its output.

## The live-run mechanism, and what it does not fix

The seed coerces every imported run to `COMPLETED` for a good reason —
`STALE_CUTOFF_MS` is 120s, the sweep runs every minute, and a heartbeat-less
`IN_PROGRESS` run is reconciled back to `PENDING` mid-session. So a flow that
needs a live run declares `liveRun`, and `run.ts` starts
`src/scripts/demo-live-run.ts` alongside the take: it stamps a real heartbeat
every 15s and settles the run back to `COMPLETED` on the way out.

Verified end to end against the demo workspace: the hero run flips to
`IN_PROGRESS`, the plan's badge reads "In Progress", the sweep leaves it alone,
and stopping the heartbeat returns it to `COMPLETED` with the heartbeat cleared.
No app change, no demo-only branch in the sweep, nothing on camera faked.

It is necessary for 11, 12 and 15, and sufficient for the first two. 15 stays
blocked on the toolbar above — a live run is not much use when the button that
kills it is not on the page.

## The snapshot data gaps, checked one at a time

The plan named three suspected gaps from the committed table list. Checked
against a seeded workspace, none of them needs a snapshot change, and the two
real gaps found by the audit belong to episodes that are blocked for other
reasons.

**Notes — already decided, and decided correctly.** `manifest.data.ts` classifies
`notes` as `ignored`, with the reason in the file: _"not FK-reachable from the
export roots; the hero seed authors its own notes."_ The hero fixture carries
four, and they render — a migration gotcha, a tile-cache invalidation rule, an
antimeridian rule, a deploy note. 04's note beat and 10's opening beat both have
a real note to open. Adding `notes` to the export would not help the beat that is
actually broken (10's payoff), because that one needs note **embeddings** and no
such table exists in the schema at all.

**Projects — one row in the export, three in the workspace.** `projects.jsonl` is
one row, but the hero overlay adds `atlas-api` and `atlas-web`, so `/projects`
renders three. That is not an index of one, and 04 beat 5 opens a seeded project
without ceremony. No change.

**Rule applications — five rows, and five is enough, with a framing caveat.**
`PlanRuleApplications` renders on the plan detail Output tab and returns `null`
when a plan has none. The five applied rows sit on five different plans, so any
one plan shows **one** line: a state badge, a truncated rule id, a truncated task
id. That is honest — it is what a rule firing once on a plan looks like — but it
is thin picture for a five-second hold, and 09's flow should crop tightly to the
list rather than to the page. Inflating it with fabricated applications would be
inventing picture, which this plan is explicitly not permission to do.

**Skill availability rules — a real gap, deliberately left open.**
`skill_availability_rules` is 0 rows and `/skills/availability` renders "No rules
yet". Closing it means attaching a rule set to a project, and the page resolves
its project from the workspace **repository**, which is an imported row — so a
hero rule set would have to pin an imported project id. That is exactly the
coupling `DataRequirement`'s own documentation warns against, because the next
snapshot refresh breaks it silently. Since 19 is blocked on its composer beats
regardless, the cost of that coupling buys nothing today. Left open, recorded
here.

**Scheduled-run token cost — a real gap, also left open.** `cost_usd` and
`total_tokens` are classified `keep`, so the export is faithful; the real rows
simply have no cost recorded. 14 is blocked on its plan picker anyway, so a hero
run with invented token counts would be fiction added to close a gap nobody is
currently standing in.

## What this changed in the episode modules

- **07** — `blockedOn` restated to name `FEATURE_BETA_PREVIEW`, the beta banner
  and the embedding-provider dependency.
- **06, 10, 14, 18, 20** — `blockedOn` populated, having been empty.
- **19** — `dataRequirement` added for skill availability rules.
- **14** — `dataRequirement` added for run token cost.
- **16** — existing `blockedOn` confirmed, unchanged.

A `dataRequirement` is only added where more rows would actually fix the beat.
Where nothing seedable can fix it — no notes in the embedding corpus, no Ollama
on the host, no ingest service — the finding is a `blockedOn`, because a
requirement the seed can never satisfy just turns every future seed red.
