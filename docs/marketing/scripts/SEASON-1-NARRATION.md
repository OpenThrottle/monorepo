# Season 1 narration — three iterations per episode

One file, twenty-four episodes, seventy-two takes. Every episode `01`–`22` plus
`L1` and `L2` gets three complete narration tracks, written against its existing,
frozen beats. Beats carry the picture; these iterations carry only the words —
one recording serves all three takes, which is the entire economic case for
iterating (see `docs/marketing/episode-format.md` on the byte-identical action
columns of episode 05's five files).

Everything below the **Episodes** heading follows the template at the bottom of
this header. Everything above it is the contract the seventy-two takes are
written to.

---

## Voice charter

The feeling is a sixteen-year-old handed the keys to their first car. The road
is open, the potential is limitless, and nothing about it is hedged or
defensive. That is a vibe, and seventy-two takes written to a vibe will not
agree with each other — so here it is as rules a writer can fail:

1. **Present tense, second person.** The viewer is doing this, now. "You ask
   for a plan" — not "a user could ask" or "we asked".
2. **Open-road framing.** Every claim is about what becomes possible, never
   about what is broken or missing today. If a sentence needs a villain — lost
   context, flaky agents, chat-history amnesia — it fails, even when the
   villain is real. The product is the headline, not the rescue.
3. **No hedging verbs.** Banned outright: _can help you_, _aims to_, _is
   designed to_, _tries to_, _should_, _lets you_ when _you_ + verb works.
   The product does the thing or the sentence doesn't ship.
4. **No enterprise register.** Banned outright: _leverage_, _seamless_,
   _robust_, _streamline_, _empower_, _solution_, _enterprise-grade_,
   _best-in-class_, _end-to-end_. If it belongs on a vendor slide it does not
   belong in a take.
5. **Momentum in the rhythm, not the adjectives.** Each sentence hands off to
   the next — a step, then what that step just unlocked. Three parallel
   sentences in a row ("X. Also Y. And Z.") is a feature list being read
   aloud, and it fails.
6. **Write for the ear** (inherited from `README.md`, still binding): short
   sentences, one clause each, no bullet-speak, no parentheticals, and never a
   URL, flag string, or UUID spoken aloud — those belong on screen or in the
   description.

### Do / don't

Real lines from the current scripts, and the direction of the rewrite:

| Don't (current line)                                                                 | Why it fails                                | Do (charter rewrite)                                                                                     |
| ------------------------------------------------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "OpenThrottle gives coding agents the one thing they have never had." (`01`, 0:07)   | Frames a lack — the hook is a deficiency    | "OpenThrottle gives your agents a home for the work. Plans, tasks, and every run on the record."         |
| "Agents already make plans — they just disappear into chat history." (`05-v1`, 0:00) | Opens on the villain, not the road          | "One command, and your agent files real plans — plans it can run, straight from where you already work." |
| "Restart the agent. Servers only load at startup." (`05`, 0:24)                      | Caption-speak; explains a limitation flatly | "Restart once, watch the banner light up connected — and setup is behind you for good."                  |
| "This can help you keep every run traceable." (register example)                     | Hedge — _can help you_                      | "Every run lands on the record. Ask why a line of code exists, six months from now, and get the answer." |

---

## Word budget

**Shorts: 115–132 spoken words per iteration.** The ceiling derives from
`docs/marketing/format.json`: 145 wpm against the 55-second short target is
132 words, hard. The floor is **110** — under that, a take is under-narrated
and goes back for another pass. Counts are recorded per take in its `###`
heading.

**Long-form (`L1`, `L2`): 1,200–1,400 spoken words per iteration.** Same
145 wpm read against roughly ten minutes of picture, with deliberate air left
around chapter boundaries and the moments where the screen carries the story.

**This reverses `README.md`'s standing guidance — deliberately.** That file
says "the budget is a ceiling, not a target" and that most shorts should land
25–35 seconds of speech across 55 seconds of picture. That guidance produced
takes like `01` at 101 words and `05-v3` at 102 — technically in budget,
roughly 42 seconds of speech, and a quiet back third. The decision for this
rewrite is the opposite: **fill the runtime — context beats empty space.**
Silence is still allowed where the action is doing the explaining; it is no
longer the default. Until `README.md` is updated to match, _this file_ is the
current word-budget authority.

---

## The three theses

One set of three lenses, used for every episode, so takes are comparable
episode to episode instead of being three arbitrary rewrites each. Ids name
the thesis, never an ordinal — `payoff-first`, not `v3` — because the ordinal
records the one fact nobody needs (per `episode-format.md`).

Episode 05's four retired variants (`-v0`…`-v3`) are the evidence for this
choice — they were the only episode ever iterated, and their front-matter
prose records what each lens was betting on:

- **`payoff-first`** — carried forward from `05-v3` ("Payoff first: promises
  the outcome up front and closes on what you do with it next"). The take
  opens on the finished thing — the outcome already on screen — then rewinds
  through how you got it. Bets that the first two seconds are won by showing
  the destination.
- **`how-it-works`** — carried forward from `05-v2` ("How it works: teaches
  while it demos… best for a skeptical developer audience that wants to know
  what's actually happening"). The take narrates the mechanism: what each step
  actually does and why it works. Bets that developers trust what they
  understand.
- **`first-drive`** — new; replaces `05-v1`'s "Why this matters" lens. v1 led
  with the pain ("agents already make plans — they just evaporate into chat
  history") and its own notes call that "the strongest hook of the three" —
  but a pain-led hook is exactly the deficiency framing rule 2 bans, so the
  lens is retired, not renamed. What replaces it keeps the immediacy without
  the villain: the take rides shotgun with the viewer's own hands — you type
  this, this happens, now you can do _that_. Bets that momentum itself is the
  hook.

`05-v0` was the unnamed base take — a plain narrated walkthrough with no
thesis. It has no successor: every take here bets on something.

One more note carried from the retired variants so it isn't lost: their
pacing target of **1.8–2.2 words per second per beat** ("so the read stays
unhurried with no dead air") is a good per-beat sanity check inside the
115–132 total, and applies to all three lenses.

---

## Per-episode template

One `##` per episode. Under it: the beat times once, as a reference row, then
the three iterations. An iteration is a `###` heading carrying the thesis id
and word count, one line of thesis prose, and a flat cue list — nothing else.
No per-iteration front matter, no repeated action column, no tables. The
`[[time, text], …]` list is already the `NarrationCue[]` shape the typed
episodes take (OT 2cef373a), so migration is a copy, not a translation.

```markdown
## 01 — What is OpenThrottle in 60 seconds

beats: 0:00 0:07 0:15 0:24 0:33 0:41 0:49 · source: 01-what-is-openthrottle.md

### payoff-first (127 words)

One line on what this take is betting on.

[
['0:00', 'the words'],
['0:07', 'the words'],
]
```

A cue does not have to start on a beat, and a variant owns its own timings —
a slower read may hold an opening longer (per `episode-format.md`). Every cue
must still land inside the episode's runtime, and for long-form, inside its
chapter's span.

---

## Relationship to the typed-episode migration — and when this file retires

This is the single place this relationship is written down. This file is a
**drafting surface** for the typed-episode migration (OT 2cef373a): each
iteration's `[[time, text], …]` cue list is already the `NarrationCue[]` a
typed episode's `Variant` holds, and each thesis id and thesis line map to
`Variant.id` and `Variant.thesis`. Migrating an episode is a copy into its
`variants[]`, not a translation.

That plan states the markdown scripts disappear with nothing regenerating
them, and this file is not an exception: **it retires when the migration
lands** — once every episode's three takes live as `variants[]` on typed
episodes, delete this file rather than letting it drift as a second source of
truth.

Follow-up deliberately not done here: retiring `05-connect-ot-mcp-v0…v3.md`.
Their rationale now lives in this file's episode 05 thesis fields (and in the
migrated episode module on the migration branch); the files themselves are
removed by the migration, not by this plan.

---

## Audit record (2026-08-25)

The full pass over all seventy-two takes, run after the writing was done.

**Word count — pass.** Every short sits in 115–132 (observed range 115–132),
both long-forms sit in 1,200–1,400 per iteration (L1: 1203 / 1201 / 1205;
L2: 1201 / 1218 / 1206), and every `###` heading's recorded count matches an
independent recount of its cue list.

**Validator decision: not extended.** `scripts/validate-video-scripts.ts`
parses one markdown file per episode and does not read this file. It was NOT
extended to parse these cue lists, deliberately: this file is a drafting
surface that retires when the typed-episode migration (OT 2cef373a) lands, and
its permanent successor — `variants[]` on typed episodes — gets validation in
TypeScript for free. Counts here were verified with a one-off counter
(whitespace-split of each cue's text, summed per iteration); re-run one with
the same definition if the file is edited.

**Claims — pass.** Every cue was written against its episode's action column
and re-checked: 01 and 13 carry the traceability claim only on the run-output
commit line and the commit footers plus dashboard search — no commit-link UI
is narrated. 05 is written against the recorded action column (the retired
variant set's). 07 and 16 are marked not recordable in their sections; 15 is
kill-only with no cancel narrated. 11, 12, 14, 17 and L1's act four never
claim a model call happens during the take. 21's search stop is the header
commander.

**Voice — pass after two fixes.** A scan of all 618 cues for the charter's
banned list (hedging verbs, enterprise register, spoken URLs, flag strings,
UUIDs) found two violations, both in L1's first-drive — a "best-leveraged"
and a "should not exist" — and both were rewritten. No cue speaks a URL, a
flag string, a tag literal, or an id.

---

# Episodes

## 01 — What is OpenThrottle in 60 seconds

beats: 0:00 0:07 0:15 0:24 0:33 0:41 0:49 · source: 01-what-is-openthrottle.md

Channel trailer. Per the source's standing note: there is no commit-link UI —
the traceability claim lives in the run output stream's commit line, and every
take below points only there.

### payoff-first (129 words)

Opens on the finished thing — a live plan mid-run — and spends the minute
unpacking what the viewer is already looking at.

[
['0:00', 'This is a plan your agent can run. A real record with tasks, owners, and status, live in a dashboard built for the work.'],
['0:07', 'One task is already in progress. Your agent picked it up on its own, and the board lights up to show it.'],
['0:15', 'Open the task and the whole story is there. Its order, its state, its place in the plan. The agent finishes this one before it starts the next.'],
['0:24', 'Back on the plan, the run is streaming. You watch the work land, line by line, while it happens.'],
['0:33', 'And right there in the output, the commit — naming the exact task it closed.'],
['0:41', 'The plan keeps the why. Ask six months from now why a line of code exists, and get a real answer.'],
]

### how-it-works (125 words)

Teaches the execution model — records, ordered tasks, streamed runs — so the
skeptic leaves knowing what a plan mechanically is.

[
['0:00', 'A plan is a database record. Tasks, owners, status — structured work an agent can read the same way you do.'],
['0:07', 'Each task carries a state. In progress means an agent owns it right now, and the board shows exactly which one.'],
['0:15', 'Tasks are ordered on purpose. The agent takes the next one, finishes it, and only then moves on — that is the whole execution model.'],
['0:24', 'While it works, the run streams its output straight to the plan. This is the live record, not a summary after the fact.'],
['0:33', 'When the agent commits, the commit line lands in that stream, naming the task it closed.'],
['0:41', 'And the description holds the intent. Code, commit, task, plan — one chain you can walk in either direction.'],
]

### first-drive (126 words)

Hands the viewer the keys in the first breath and narrates the screen as
their own test drive.

[
['0:00', 'Here are the keys. This is your plan — real tasks, real owners, real status, already moving without you.'],
['0:07', 'Hover the list. That highlighted task, the one in progress? Your agent is on it right now.'],
['0:15', 'Click in. Order, state, the whole shape of the work. Your agent finishes this task completely before it touches the next one.'],
['0:24', 'Now watch it drive. Output streams out of the run live, right on the plan, line after line while the work lands.'],
['0:33', 'Scroll down and there is the commit itself — and it names the exact task it just closed.'],
['0:41', 'And up in the description sits your why, right next to everything it produced. Six months from now, you will be glad it is all in one place.'],
]

## 02 — 0 to 60: boot the whole stack with one command

beats: 0:00 0:08 0:18 0:26 0:31 0:39 0:48 0:53 · source: 02-one-command-boot.md

### payoff-first (126 words)

Promises the running stack in the first line and lets the terminal deliver it.

[
['0:00', 'One command, and the whole stack is on its way up. Postgres, Redis, the API, the dashboard — and a login already seeded and waiting for you.'],
['0:08', 'The database and Redis come up in Docker first, and every pending migration applies on its own. Fresh machine or old checkout, the result is the same.'],
['0:18', 'Then it seeds a user for you, so your very first boot lands on a working account.'],
['0:26', 'One more command starts it all.'],
['0:31', 'The API boots first. The dashboard waits for it, then follows it right up.'],
['0:39', 'And there it is. Signed in, seeded data on screen, the whole platform live.'],
['0:48', 'From here on, everything happens on your machine. No cloud account, no API key, no signup — just the open road.'],
]

### how-it-works (124 words)

Explains what the script actually does — Docker, idempotent migrations, seed,
boot order — so the boot feels earned, not magic.

[
['0:00', 'One script owns the whole environment. It boots Postgres, Redis, the API and the dashboard, and seeds a login on the way.'],
['0:08', 'Infrastructure first: Docker brings up the database and Redis, then the script applies every pending migration — idempotent, so re-running is always safe.'],
['0:18', 'It seeds a user too. That is why first boot lands on a working login instead of an empty database.'],
['0:26', 'Boot is a second command, and the order matters.'],
['0:31', 'The API has to be up before the dashboard asks it for data, so the dashboard waits, then follows.'],
['0:39', 'By the time the browser loads, you are authenticated with seeded data — everything the setup promised, running.'],
['0:48', 'All of it on your machine. The stack is yours, top to bottom.'],
]

### first-drive (125 words)

Rides the terminal output with the viewer — type, watch it roll, type again,
and the browser lights up.

[
['0:00', 'Empty terminal, blank browser. Type one command and let it rip — database, cache, API, dashboard, and a seeded login, all incoming.'],
['0:08', 'Watch the Docker lines roll. Postgres and Redis stand up, and the migrations apply themselves while you sit there.'],
['0:18', 'There is your seeded user scrolling past. Your account exists before you have touched a thing.'],
['0:26', 'Now type the start command — the second and last one you need.'],
['0:31', 'The API climbs first, the dashboard right behind it — they know their own order.'],
['0:39', 'And the browser side flips on. Signed in, seeded data on screen, the whole stack alive and waiting on you.'],
['0:48', 'This is all yours, running on your machine. No cloud account, no API key, no signup — go build something.'],
]

## 03 — Your first plan in 60 seconds

beats: 0:00 0:06 0:14 0:24 0:31 0:41 0:49 0:54 · source: 03-first-plan.md

### payoff-first (127 words)

Promises a runnable plan inside the minute, then builds it.

[
['0:00', 'Sixty seconds from now, you will have a plan an agent can pick up and run. It starts with one button.'],
['0:06', 'Title first. Say what you want the way you would say it to a teammate — add rate limiting to the public API.'],
['0:14', 'Then the why. Two sentences of intent — and this is the part your agent reads before it touches anything.'],
['0:24', 'Create it, and you have a real plan. Empty task list, full of potential.'],
['0:31', 'First task in. One thing, small enough to finish in a sitting — that is the size that keeps an agent moving.'],
['0:41', 'Second task, same way. They hold the order you gave them.'],
['0:49', 'And that is the whole thing. Point an agent here and it works, top to bottom.'],
]

### how-it-works (130 words)

Explains what each field is for — who reads the title, the description, the
task list, and why order matters.

[
['0:00', 'A plan is where the work lives, and building one takes a minute. Watch what each field is actually for.'],
['0:06', 'The title is the goal, in your own words. Plain language works because the reader is an agent, not a form validator.'],
['0:14', 'The description carries intent. Your agent reads this before it writes a line of code, so the why goes here.'],
['0:24', 'Creating the plan gives you the container — a record with a task list, ready to fill.'],
['0:31', 'Tasks are the unit of execution. One sitting of work each, so every finish is a clean commit point.'],
['0:41', 'And order is a feature. Tasks run top to bottom, exactly as you arranged them.'],
['0:49', 'That is the contract. A goal, a why, ordered work — everything an agent needs to drive.'],
]

### first-drive (125 words)

Builds the plan with the viewer's hands, field by field, in real time.

[
['0:00', 'Your first plan. Click new, and let us build it together, right now.'],
['0:06', 'Type the title like you mean it — add rate limiting to the public API. No special syntax, just what you want.'],
['0:14', 'Now give it two sentences of why. Your agent will read these first, so tell it what matters.'],
['0:24', 'Hit create. There is your plan — a real record now, task list open and ready for you.'],
['0:31', 'Drop in the first task. Keep it one sitting long, small enough to finish clean.'],
['0:41', 'Add another, and watch them stack in exactly the order you chose.'],
['0:49', 'Done — and it took you about a minute. Point any agent at this plan and it runs the whole thing, top to bottom, in your order.'],
]

## 04 — Plans, tasks, notes, projects: the mental model

beats: 0:00 0:05 0:12 0:21 0:31 0:41 0:50 0:54 · source: 04-mental-model.md

### payoff-first (118 words)

Promises the whole system in four words, then pays each word off on screen.

[
['0:00', 'Four words, and the whole system is yours. Plan, task, note, project — here they are on a live screen.'],
['0:05', 'A plan is a goal with ordered work under it. This header, this list — that is one plan.'],
['0:12', 'A task is one unit of that work. It carries a status, and exactly one owner at a time.'],
['0:21', 'A note is context — something you learned, written down where every future search can find it.'],
['0:31', 'A project is a checkout on disk. It tells your agent exactly where the code lives.'],
['0:41', 'And they snap together. Plans point at a project. Tasks live under plans. Notes surface anywhere you search.'],
['0:50', 'That is the whole vocabulary. Now you speak it.'],
]

### how-it-works (130 words)

Teaches the hierarchy and the wiring between the four ideas, ending on the
plan-to-disk bridge.

[
['0:00', 'The whole platform runs on four ideas, and each one is on screen in this minute.'],
['0:05', 'The plan is the top of the hierarchy — a goal, and under it, an ordered list of the work.'],
['0:12', 'A task is the unit an agent executes. Status says where it is; single ownership says who has it — one owner at a time, always.'],
['0:21', 'A note holds what you know. Agents search notes for context, so what you learn once stays learned.'],
['0:31', 'A project maps everything to disk. It is the checkout your agent works in — the bridge from records to real code.'],
['0:41', 'The wiring is simple. Plans point at one project, tasks belong to one plan, and notes cut across all of it.'],
['0:50', 'Four ideas. That is the entire model.'],
]

### first-drive (118 words)

Walks the screens with the viewer — each word learned by looking at it.

[
['0:00', 'Learn four words with me and you can drive this whole thing. Starting now.'],
['0:05', 'This is a plan — your goal, with the work lined up under it in order.'],
['0:12', 'This row is a task. One piece of work, one status, one owner holding it at a time.'],
['0:21', 'Over in notes — this is where you park what you learn, and where your agent goes looking for it later.'],
['0:31', 'And projects. Each one is a checkout on your disk, so the agent always knows where the code is.'],
['0:41', 'Back on the plan, see the project badge? Plans point at projects, tasks sit inside plans, and notes answer any search.'],
['0:50', 'Four words, one minute. You already speak the language.'],
]

## 05 — Connect OpenThrottle to Claude Code in 60 seconds

beats: 0:00 0:09 0:15 0:24 0:31 0:39 0:44 0:53 · source: 05-connect-ot-mcp.md

Narration is written against the recorded action column (the `-v0`…`-v3` set,
which the 05 screencast was captured from): highlight the printed install line,
run it at user scope, restart to the connected banner, ask for a plan with three
tasks, and refresh `/plans` to the payoff.

### payoff-first (130 words)

From `05-v3` — "promises the outcome up front ('in sixty seconds your agent will
be filing plans on its own') and closes on what you do with the plan next…
every beat holds 1.8–2.0 words/second so the read stays unhurried with no dead
air" — the same bet, filled to the new budget.

[
['0:00', 'Sixty seconds from now, your agent is filing real plans into OpenThrottle — plans it can run. One command prints everything you need.'],
['0:09', 'That highlighted line is yours. Today it is Claude Code — every agent CLI connects the same way.'],
['0:15', 'Run it once and you are covered everywhere. Every project, every worktree, every terminal on this machine.'],
['0:24', 'One restart, the banner lights up connected, and setup is behind you for good.'],
['0:31', 'Now collect the payoff. Ask for a plan the way you would ask a teammate — plain English, three tasks.'],
['0:39', 'Your agent writes the plan and its tasks straight into OpenThrottle. Real records, ready to run.'],
['0:44', 'Refresh the dashboard and there it is. A plan nobody typed in, three tasks ready to run in parallel, every run tracked.'],
]

### how-it-works (131 words)

From `05-v2` — "teaches while it demos: what the user scope is, why the restart
matters, why the plan appears in the dashboard. Best for a skeptical developer
audience that wants to know what's actually happening. The 0:44 line does the
most connect-the-dots work of the three: rooted in source, executable in
parallel, every run tracked… 1.9–2.2 words/second."

[
['0:00', 'OpenThrottle ships an MCP server — the standard your agent already speaks. One command prints the exact wiring for every agent CLI.'],
['0:09', 'Here is the line for Claude Code — the part doing the real work is the user scope.'],
['0:15', 'User scope registers the server once, globally. Any repo you open on this machine is already connected — no per-project config.'],
['0:24', 'Agents load their servers at startup, so one restart brings the connection live. The banner proves it.'],
['0:31', 'Plain English is the whole interface. Describe the plan; your agent calls the server\'s tools.'],
['0:39', 'Those tools write real database records — a plan, its tasks, and the order they run in.'],
['0:44', 'So the dashboard already has it on refresh. Same records — rooted in your source, executable in parallel, every run tracked.'],
]

### first-drive (132 words)

Successor to `05-v1`'s "Why this matters" — its notes call the pain-led hook
"the strongest hook of the three; best if the short has to earn attention in
the first two seconds… 1.8–2.2 words/second" — keeping that two-second
immediacy, riding shotgun with the viewer's hands instead of opening on a
villain.

[
['0:00', 'Keys in hand. One command, and the entire setup prints in front of you — everything you need, ready to copy.'],
['0:09', 'See the highlighted line? That one is yours. Claude Code today — any agent CLI takes the same line.'],
['0:15', 'Run it. One confirmation and you are installed everywhere — every project, every worktree, every terminal on this machine.'],
['0:24', 'Restart your agent and watch the banner flip to connected. That is the whole setup.'],
['0:31', 'Ask for a plan, right in the chat — the feature you have been itching to build, three tasks.'],
['0:39', 'It comes back with a plan id. Your agent just filed real, runnable work.'],
['0:44', 'Flip to the dashboard and refresh. There is your plan, tasks lined up, ready to run in parallel — while you start the next idea.'],
]

## 06 — Turn a PRD into a plan and tasks

beats: 0:00 0:07 0:12 0:21 0:29 0:38 0:46 0:54 · source: 06-prd-to-plan.md

### payoff-first (130 words)

Promises the spec-to-plan transformation up front and delivers it beat by beat.

[
['0:00', 'This spec is about to become a runnable plan, tasks and all — and you will not type a single one of them.'],
['0:07', 'Here is the door — one page, one drop zone, ready for whatever you wrote.'],
['0:12', 'Drag in any document you already have. A spec, a ticket, a wall of notes — it all works.'],
['0:21', 'Hit decompose and it reads the whole thing — every section, every requirement — and pulls out the actual work.'],
['0:29', 'And there is the payoff. A draft plan with ordered tasks, fully editable, before anything is saved.'],
['0:38', 'You stay the editor. Rename a task, delete a task — your judgment is part of the pipeline.'],
['0:46', 'Save it, and your agents have a real place to start — a plan that began as prose.'],
]

### how-it-works (125 words)

Explains the decompose mechanism and why the proposal step is deliberately
unsaved.

[
['0:00', 'A spec already contains the plan — it is just written for people. Watch it become something an agent can run.'],
['0:07', 'The upload and decompose route takes it from here.'],
['0:12', 'Drop in the document. Format barely matters — a spec, a ticket, a wall of notes all decompose the same way.'],
['0:21', 'Decompose reads the full text and extracts the work items — the actual verbs, not the headings.'],
['0:29', 'What comes back is a proposal. A plan and ordered tasks, rendered editable, saved nowhere yet.'],
['0:38', 'That is deliberate. You correct it while it is still a draft — rename here, delete there — because it will get something wrong.'],
['0:46', 'Save, and the proposal becomes a real plan. From prose to runnable work in under a minute.'],
]

### first-drive (121 words)

The viewer drives the whole conversion — drag, decompose, correct, save.

[
['0:00', 'You wrote the spec. Now watch it turn into a runnable plan while you steer.'],
['0:07', 'Head to the upload page — this is the door for documents.'],
['0:12', 'Drag your document straight onto the drop zone — a spec today, a ticket or a wall of notes tomorrow.'],
['0:21', 'Click decompose and let it read. It is pulling the real work out of your prose right now.'],
['0:29', 'There is your draft — a whole plan, tasks in order, every line still yours to change.'],
['0:38', 'So change it. Fix that title, drop that extra task. You know the work better than any first draft.'],
['0:46', 'Save, and it is real. Your agents can start from here — and the spec did most of the typing.'],
]

## 07 — Semantic search across every plan you have ever written

beats: 0:00 0:08 0:18 0:27 0:36 0:46 0:54 · source: 07-semantic-search.md

**Blocked, and stays blocked** (restating the source's `blockedOn`): the
`/search` route is unreachable in a production build — it redirects to
`/dashboard` — and search today is the ⌘K commander, a different UX from the
results page these beats describe. Words ready; not recordable until the route
is fixed or the script is redesigned around the commander.

### payoff-first (120 words)

Opens on two years of plans already paying rent, then shows the
meaning-not-keywords search earning it.

[
['0:00', 'Two years of plans, and every one of them is still working for you. Watch this search find one by meaning alone.'],
['0:08', 'Type the problem, not the title — describe it the way you would say it out loud.'],
['0:18', 'These results do not share a single word with the query. Plans, tasks, notes — all of them are still a match.'],
['0:27', 'Hover one and it shows you why. Everything you write is embedded the moment you save it.'],
['0:36', 'Click through, and there is the plan from months ago — what you decided, and why you decided it.'],
['0:46', 'And here is the real payoff — your agents search this exact index before they start work, so what you learned keeps compounding.'],
]

### how-it-works (120 words)

Teaches the embedding mechanism — why meaning-matching works and who else
queries the index.

[
['0:00', 'Search here works on meaning, not keywords — and that quietly changes what you can ask of your own history.'],
['0:08', 'So skip the title. Type the problem itself, in plain language, exactly the way you would ask a teammate.'],
['0:18', 'Look closely — these results share not a single word with the query. They match because they mean the same thing.'],
['0:27', 'Here is the mechanism. Every plan, task, and note is embedded on save, so the index always knows your latest work.'],
['0:36', 'The top result opens straight into a plan from months back, with its decisions and reasoning intact.'],
['0:46', 'And the same index serves your agents. They query it before touching code, which is the entire point of writing things down.'],
]

### first-drive (120 words)

Hands the viewer the query box and lets them feel the meaning-match land.

[
['0:00', 'Here is a superpower — searching two years of plans by what they mean, not what they say. Try it with me.'],
['0:08', 'Clear the box and type it the way you would actually say it out loud — how did we handle retries.'],
['0:18', 'Now look at what came back. Plans, tasks, notes — and not one of them shares a word with what you typed.'],
['0:27', 'Hover the top hit — it tells you why it matched. Everything you save gets embedded, automatically.'],
['0:36', 'Click in. There it is — the plan you half remembered, with the decision and the why still attached.'],
['0:46', 'And your agents run this same search before they start. Every plan you write makes the next one smarter.'],
]

## 08 — Promote a task into its own plan

beats: 0:00 0:08 0:16 0:21 0:31 0:41 0:48 0:54 · source: 08-promote-task.md

### payoff-first (126 words)

Promises the one-click upgrade — task to plan, nothing lost — then shows the
link that makes it safe.

[
['0:00', 'This task is about to become a whole plan — one click, nothing retyped, nothing lost. Watch, because it has earned the upgrade.'],
['0:08', 'Scroll the description. This is five tasks wearing one task\'s clothes, and that is normal — work grows.'],
['0:16', 'So promote it. One click, right there in the task toolbar.'],
['0:21', 'And it is a plan now. Title carried over, description carried over — everything it knew, it still knows.'],
['0:31', 'Back on the original plan, the task keeps a link pointing at where the work went.'],
['0:41', 'Follow it and you land right back here. Nothing lost, nothing duplicated — one thread, two records.'],
['0:48', 'Now break it down properly — task by task, each one sized to finish in a sitting, the way it always deserved.'],
]

### how-it-works (123 words)

Explains promote as a structured copy plus a two-way link — the contract that
makes rescoping safe.

[
['0:00', 'Tasks grow. This one outgrew its shape, and the system has a first-class move for exactly that.'],
['0:08', 'The description tells the story — scroll it and you can count the separate pieces of work hiding in here.'],
['0:16', 'Promote to plan is the move. It lives in the task toolbar.'],
['0:21', 'What happens is a structured copy — the task\'s title and description become the new plan\'s title and description.'],
['0:31', 'And the original task is not deleted. It stays, holding a link to the plan the work moved into.'],
['0:41', 'That link is the contract — nothing lost, nothing duplicated, and the history reads in both directions.'],
['0:48', 'From here you decompose it for real — first task in, right at the size an agent can finish.'],
]

### first-drive (122 words)

The viewer performs the promotion on the task they recognize from every
project they have ever run.

[
['0:00', 'You know this task. The one that kept growing. Today you give it the room it needs.'],
['0:08', 'Scroll with me — look how much work is packed in this one description. That is a plan in disguise.'],
['0:16', 'Hit promote to plan — one click in the toolbar, and watch what it takes with it.'],
['0:21', 'Boom — it is a plan. Your title, your description, everything came along for the ride.'],
['0:31', 'Flip back to the original. The task now points at the new plan, so the trail stays warm.'],
['0:41', 'Click through and you are back — nothing lost, nothing typed twice.'],
['0:48', 'Now do the fun part. Break it down into tasks that actually fit — and hand the whole thing to an agent.'],
]

## 09 — Tags and rules: automate what happens when work gets labelled

beats: 0:00 0:09 0:16 0:25 0:35 0:42 0:50 0:55 · source: 09-tags-and-rules.md

No tag string is spoken in any take — the label stays on screen.

### payoff-first (124 words)

Opens on the automation already firing, then rewinds through how it was built.

[
['0:00', 'One tag, and the system just acted on its own — there is the toast to prove it. Here is how you wire that up.'],
['0:09', 'Rules live here. Each one watches for a label and does something about it.'],
['0:16', 'This is the one that fired. When a plan gets that tag, run this action. That is the whole grammar.'],
['0:25', 'Making your own is two choices — the label to watch, and the thing to do about it.'],
['0:35', 'Save, and it is live immediately. No deploy, no restart, nothing else to press.'],
['0:42', 'From now on, every plan labelled this way gets handled the same way — automatically, every time.'],
['0:50', 'And the application list shows exactly what ran and when, so the automation stays fully visible.'],
]

### how-it-works (123 words)

Teaches the watcher model — tag in, action out — and the audit trail that
keeps it trustworthy.

[
['0:00', 'Watch the toast. Adding one tag just triggered an action, and the mechanism behind it takes a minute to learn.'],
['0:09', 'The rules page is the control room. A rule is a watcher — it waits for labels and responds.'],
['0:16', 'Open the one that fired and read it plainly. When a plan receives this tag, perform this action.'],
['0:25', 'A new rule is the same two decisions in a form. Choose the tag, choose the action.'],
['0:35', 'Saving enables it on the spot — the watcher is live before you leave the page.'],
['0:42', 'Add the tag anywhere and the rule fires again. Same label, same handling, every single time.'],
['0:50', 'And every firing is recorded here, so you always know what your rules did on your behalf.'],
]

### first-drive (123 words)

The viewer builds their first rule and gets to watch it fire.

[
['0:00', 'Add one tag with me and watch something happen by itself. See the toast? You built nothing yet — but you are about to.'],
['0:09', 'Come over to rules. This is where the little machines live.'],
['0:16', 'Here is the one that just fired. A tag comes in, an action goes out — read it like a sentence.'],
['0:25', 'Now build yours. Pick the label you care about, and pick what happens next. Two choices, that is all.'],
['0:35', 'Save it. Live, enabled, and already watching for the next label.'],
['0:42', 'Tag a plan and watch your own rule fire for the first time. That never stops being satisfying.'],
['0:50', 'And down here, the receipts — every run your rule has ever made, listed where you can check it.'],
]

## 10 — Notes: capture context your agents can actually find

beats: 0:00 0:08 0:18 0:27 0:32 0:41 0:50 0:55 · source: 10-notes.md

The 0:32 beat searches from `/search` — the same route 07's `blockedOn`
covers; if 07's fix lands as a commander redesign, this beat inherits it.

### payoff-first (127 words)

Opens on the note as a permanent asset that pays out on every future search.

[
['0:00', 'This note is an afternoon of hard-won debugging, kept forever — and it pays out again every time anyone, human or agent, searches near it.'],
['0:08', 'Making one is nothing. A title — the same line you would have typed into a chat somewhere.'],
['0:18', 'Then two sentences of body. What broke, and what fixed it. That is genuinely enough.'],
['0:27', 'Save it, and it joins the list — indexed the moment it lands.'],
['0:32', 'Months later, you search the symptom. Not the title — you will not remember the title — the symptom.'],
['0:41', 'And there it is. Your agents query this same index before they start work, so they find it too.'],
['0:50', 'The fix gets found once, and it stays found — for you and for every agent after you.'],
]

### how-it-works (122 words)

Explains the note's economics — one cheap write, embedded on save, permanent
reach through the shared index.

[
['0:00', 'A note is the smallest unit of knowledge in the system — and it is wired straight into the same search your agents use.'],
['0:08', 'Creating one is a title and a body. The bar is low on purpose — capture beats polish.'],
['0:18', 'Write down what broke and what fixed it. Two sentences carry the whole lesson forward.'],
['0:27', 'On save, the note is embedded automatically — indexed by meaning, not keywords.'],
['0:32', 'That is why, months later, you can search the symptom instead of the title and still land on it.'],
['0:41', 'The note comes straight back. And agents query this index before they touch code, so your gotcha becomes their guardrail.'],
['0:50', 'One write, permanent reach — that is the economics of a good note.'],
]

### first-drive (128 words)

The viewer writes the note, then time-jumps to the search that finds it.

[
['0:00', 'Open this note — an afternoon of debugging distilled to a screen. You are about to make one of your own.'],
['0:08', 'Start a new note. Give it a title — quick, plain, the words you would actually say.'],
['0:18', 'Now the body — what broke, what fixed it. Do not polish it. Write it like you would tell a teammate.'],
['0:27', 'Save it. Done — that took you thirty seconds, start to finish.'],
['0:32', 'Now jump ahead a few months and search the symptom, the way future you actually would.'],
['0:41', 'There is your note, first hit. And your agents run this same query before they start — your lesson rides along with them.'],
['0:50', 'Write it once, and it gets found forever — by you, and by every agent you send out.'],
]

## 11 — Ralph: run a plan one task at a time

beats: 0:00 0:09 0:18 0:28 0:38 0:45 0:53 · source: 11-ralph-one-task.md

Replay — the run output is pre-baked by the demo seed. No take below claims a
model is thinking during the recording; the narration describes the discipline
the stream shows.

### payoff-first (124 words)

Opens on the one-task discipline as the destination — a finished plan whose
history reads like the plan.

[
['0:00', 'One task in progress — exactly one — and a finished plan at the end of that road. This is Ralph, and the discipline is the feature.'],
['0:09', 'It always takes the lowest task that is not done, and gives it everything. The rest wait their turn.'],
['0:18', 'Work first, then proof. Lint, types, tests — the validation runs right there in the stream where you can read it.'],
['0:28', 'Only a green result closes the task. And the moment it closes, the next one opens.'],
['0:38', 'Every finished task becomes its own commit — one change, one reason, one clean line of history.'],
['0:45', 'So the plan advances one clean square at a time — two tasks done here, each one landed, validated, and committed on its own.'],
]

### how-it-works (123 words)

Teaches the loop's rules — deterministic selection, a real definition of done,
per-task commits.

[
['0:00', 'Ralph is a loop with rules, and you are looking at the first rule — exactly one task in progress at a time.'],
['0:09', 'Selection is deterministic. The lowest task that is not done gets picked, worked, and finished before anything else moves.'],
['0:18', 'Finishing has a real definition here. The work runs, then lint, types, and tests run right behind it.'],
['0:28', 'A task closes only on green. The flip you just saw — completed here, in progress there — is the loop advancing.'],
['0:38', 'And each task commits separately, so every change in the repo maps to one task in the plan.'],
['0:45', 'That mapping is the whole win — small, validated, separately committed steps, from the first task all the way to a finished plan.'],
]

### first-drive (120 words)

Reads the stream alongside the viewer as the loop takes its next careful step.

[
['0:00', 'Meet Ralph — your plan, running itself one careful task at a time. Watch how deliberately it moves through the list.'],
['0:09', 'Check the list. One task in progress, the rest waiting in the order you set. Ralph always takes the next one down.'],
['0:18', 'Read the stream with me — there goes the validation. Lint, types, tests, all green.'],
['0:28', 'And there is the flip. Task closed, next task picked up, not a beat of pause in between.'],
['0:38', 'Scroll to the commit — this task just landed in your history all by itself, one change with one reason attached.'],
['0:45', 'Two down now, and the rhythm is set. Come back later and the whole plan reads like this — step, proof, commit, step.'],
]

## 12 — Watch an agent run stream live

beats: 0:00 0:08 0:17 0:27 0:36 0:46 0:54 · source: 12-watch-run-live.md

Replay — same treatment as 11. The source hook ("working, right now, on my
machine") implied a live model call during the take; every take below states
the streaming capability without claiming one.

### payoff-first (122 words)

Opens on the stream as the product — every line of a run, landing where the
work lives.

[
['0:00', 'An agent run, streaming straight into the plan — every line of an agent\'s work, landing where the work lives.'],
['0:08', 'Each line arrives as the run produces it. Tool calls included — you see what the agent reaches for.'],
['0:17', 'And you see the retries. A command misses, the agent goes again — the honest half of the story stays in.'],
['0:27', 'Scroll back anytime. The whole run is right here, top to bottom, without interrupting a thing.'],
['0:36', 'Leave the tab, come back — still current. The stream is stored, not tailed, so nothing depends on you watching.'],
['0:46', 'One place, the full story of the run, kept forever right next to the plan that asked for it. That is observability you never set up.'],
]

### how-it-works (121 words)

Explains stored-not-tailed — why scrollback and tab-switching cost nothing.

[
['0:00', 'Runs stream their full output into the plan itself — and how that works is worth thirty seconds of your attention.'],
['0:08', 'Every line the agent writes is captured and rendered in order, as the run produces it — tool calls and all.'],
['0:17', 'Failures are captured the same way. A miss, then the retry — the stream keeps the whole sequence, not a cleaned-up summary.'],
['0:27', 'Scrolling back works because this is a record, not a tail. Earlier output is already stored.'],
['0:36', 'That is also why leaving and returning changes nothing. The stream lives in the database, so the page just re-reads it.'],
['0:46', 'Stored output, rendered in place, attached to the plan. Everything the run did, readable by anyone, at any time after.'],
]

### first-drive (121 words)

Gives the viewer the window seat — read the stream, leave it, come back.

[
['0:00', 'Pull up a plan mid-run and just watch for a second. The output pours in, line after line — this is your window seat.'],
['0:08', 'There — a tool call, right there in the stream. You see the agent reach for it the moment it happens.'],
['0:17', 'And there is a miss, followed by the retry. You get the real story, exactly as it unfolded.'],
['0:27', 'Scroll up. The entire run so far is under your thumb, and it keeps streaming while you read.'],
['0:36', 'Now leave — switch tabs, take a walk. Come back and it is all still here, stored and current.'],
['0:46', 'No terminals to attach, nothing to set up. The run writes its own story, and you read it whenever you want.'],
]

## 13 — Every commit traced back to why it exists

beats: 0:00 0:07 0:15 0:21 0:28 0:37 0:46 0:53 · source: 13-plan-id-traceability.md

Per the source: no id is read aloud — the narration says "the id", the frame
shows the footer. The claim rides the commit footers and the dashboard lookup
the beats actually show; no commit-link UI is narrated.

### payoff-first (122 words)

Opens on the promise — this commit can explain itself — then walks the chain
backwards.

[
['0:00', 'This commit can tell you exactly why it exists — and the proof is sitting at the bottom of the message.'],
['0:07', 'Two ids in the footer. The plan the work came from, and the exact task inside it.'],
['0:15', 'Every commit an agent makes here carries both of them. Automatically, every single time.'],
['0:21', 'Which means you can travel backwards through your own history. Copy the id, drop it into the dashboard search.'],
['0:28', 'And the task opens — what was asked for, its status, the plan it belonged to.'],
['0:37', 'One click up sits the plan itself, with the reason the work existed written in plain language.'],
['0:46', 'Blame tells you who. This tells you why — and it will still tell you in five years.'],
]

### how-it-works (121 words)

Explains the footer as structured metadata riding plain git, resolvable by the
dashboard.

[
['0:00', 'Here is a commit message with a footer that actually does something. Read the bottom lines.'],
['0:07', 'The footer carries two ids — one names the plan, one names the task. Structured metadata, riding in plain git.'],
['0:15', 'Agents stamp them on every commit they make. No hooks to remember, no process to enforce — it is just how they commit.'],
['0:21', 'Because the ids are real records, the dashboard resolves them. Paste one in.'],
['0:28', 'The task comes up with everything attached — description, status, and its parent plan.'],
['0:37', 'Step up to the plan and you are reading intent — the why, written before the work started.'],
['0:46', 'Git blame answers who and when. This chain answers why — from any commit, in seconds, forever.'],
]

### first-drive (120 words)

The viewer takes the walk themselves — footer, paste, task, plan, why.

[
['0:00', 'Open any agent commit in your log and look at the very bottom. There is treasure down there.'],
['0:07', 'Zoom in — two ids. One for the plan, one for the task. Your breadcrumbs.'],
['0:15', 'Every agent commit in this repo carries them both, so any commit is a starting point for the walk.'],
['0:21', 'Grab the task id and paste it into the dashboard. Watch where it takes you.'],
['0:28', 'Straight to the task — the ask, the status, the plan around it.'],
['0:37', 'Climb one level and read the plan description. That is the why, in the words you wrote at the time.'],
['0:46', 'Six months from now, this walk takes you thirty seconds. Who wrote it, what it was for, why it mattered.'],
]

## 14 — Scheduled agent runs: put work on a cron

beats: 0:00 0:08 0:16 0:26 0:34 0:40 0:50 0:55 · source: 14-scheduled-runs.md

Replay for the run-history half — the completed run opened at 0:40 is seeded.
The narration reports it as a kept record, never as work happening during the
take.

### payoff-first (119 words)

Opens on the overnight results already in hand, then builds the job that earns
them.

[
['0:00', 'These jobs ran last night while nobody was awake — and every result is sitting here waiting this morning. Here is how you set one up.'],
['0:08', 'A scheduled job is just a plan plus a time. Start by picking the plan.'],
['0:16', 'Pick the when. The cron toolbar translates as you go, telling you in plain words exactly what you chose.'],
['0:26', 'Point it at a checkout, so the job knows precisely where the code lives.'],
['0:34', 'Save, and it is on the clock. From now on, this runs itself.'],
['0:40', 'And every run keeps receipts — the full output, the model that ran it, and what it cost.'],
['0:50', 'The boring work moves to overnight, and you read the results with your coffee.'],
]

### how-it-works (125 words)

Teaches the anatomy — plan plus trigger plus checkout — and the per-run
accounting.

[
['0:00', 'Scheduled runs are plans on a clock, and the run history is where they prove themselves. Start with the anatomy.'],
['0:08', 'A job binds a plan to a schedule — the plan supplies the work, the schedule supplies the trigger.'],
['0:16', 'The cron toolbar handles the timing, and it plays your choice back in plain words, so what fires is what you meant.'],
['0:26', 'The checkout matters — a job runs against a real repository on disk, and this is where you name it.'],
['0:34', 'Saving enables it immediately. The clock takes over from here — no further ceremony.'],
['0:40', 'Each run is a full record — output, the model used, and the token cost, kept per run.'],
['0:50', 'So the schedule does the running, and the history does the accounting.'],
]

### first-drive (122 words)

The viewer sets up their own night shift and opens the receipts.

[
['0:00', 'While you slept, these jobs pulled a night shift — look at the last-run times. Come feel how quick one is to set up.'],
['0:08', 'New job. Choose one of your plans — that is the work.'],
['0:16', 'Now set the rhythm. Slide the cron controls and read the plain-words summary until it says exactly what you want.'],
['0:26', 'Tell it which checkout to work in — your code, your machine, your call.'],
['0:34', 'Hit save. It is enabled, listed, and on the clock.'],
['0:40', 'Open any past run and it is all kept — the full output, the model that ran, the token cost, receipt after receipt.'],
['0:50', 'Set one up tonight, and tomorrow you start the day the best way there is — reading finished work.'],
]

## 15 — Kill a runaway agent run

beats: 0:00 0:09 0:18 0:27 0:34 0:42 0:51 0:56 · source: 15-kill-runaway-run.md

Status update since this plan was written: the source is **no longer blocked**
— **Kill run ships** (plan toolbar and plans table) and the script was rescoped
kill-only. A graceful cancel does not exist; per the source, "do not put
cancel back into this script until there is a control to point at." No take
below narrates a cancel. Replay — the stuck run is seeded.

### payoff-first (123 words)

Opens on the promise of the button — the plan is always one click from being
yours again.

[
['0:00', 'You are always one button away from your plan back — that is the promise. Here is a run worth using it on, looping on the same command.'],
['0:09', 'Scroll it. Same attempt, again and again. This run has told you everything it is going to.'],
['0:18', 'Notice the toolbar — while a run is active, the rest of the plan stays locked. Deliberate, so two things never drive at once.'],
['0:27', 'Kill run. One button, immediate, no negotiation.'],
['0:34', 'And the run is gone. Toolbar back, plan unlocked, yours again — just like that.'],
['0:42', 'Everything it produced is kept. Read exactly how far it got and where it stalled.'],
['0:51', 'Then fix the task, run it again, and you are back on the road in a minute.'],
]

### how-it-works (123 words)

Teaches the lock-and-stop model — why the plan locks during a run, what kill
actually does, why the output survives.

[
['0:00', 'Every run lives under a hard stop, and knowing how it behaves is worth one stuck run. This one is looping.'],
['0:09', 'The stream makes it obvious — the same command, retried past the point of information.'],
['0:18', 'While the run is active, the plan\'s other actions are disabled. One driver at a time is a rule, and the tooltip says so.'],
['0:27', 'Kill run ends the process outright. Not a pause, not a request — an ending.'],
['0:34', 'The moment it dies, the lock releases. The plan\'s toolbar comes straight back.'],
['0:42', 'And the partial output survives, because it is stored — the full record of how far the run got and why it stalled.'],
['0:51', 'That record is your repair manual. Adjust the task, run it fresh.'],
]

### first-drive (119 words)

The viewer presses the button themselves and feels the plan come back.

[
['0:00', 'Here is a feeling worth sixty seconds — total, immediate control over a run that has stopped earning its keep.'],
['0:09', 'Watch the loop with me. Eleven tries at the same command. You have seen enough.'],
['0:18', 'See the greyed-out toolbar? While a run holds the plan, everything else waits — the tooltip tells you straight.'],
['0:27', 'Now press kill run. One click, and it does not negotiate.'],
['0:34', 'Gone. The toolbar wakes up, the lock releases, and the plan is back in your hands.'],
['0:42', 'Open the output — it is all still there. Skim down to the stall and read exactly what happened.'],
['0:51', 'Patch the task, start it again, and you are moving — you never lost more than the one run.'],
]

## 16 — Worktrees: parallel agents that do not step on each other

beats: 0:00 0:09 0:18 0:28 0:38 0:47 0:54 · source: 16-worktrees.md

**Blocked as an app video, and stays blocked.** Restating the source's
`blockedOn` verbatim: "Worktree state surfaced in the dashboard (today this is
a CLI-only story)." Worktrees work, but nothing in the UI shows them — this is
a terminal video or it is nothing. Words ready; **not recordable as an app
video** until worktree visibility ships.

### payoff-first (123 words)

Opens on the finished picture — two agents, zero collisions — then shows the
one command behind it.

[
['0:00', 'Two agents, two branches, one repository — working side by side with zero collisions. This is the worktree play, and it takes one command to deal in.'],
['0:09', 'That command mints a second checkout with its own branch — created, provisioned, and ready before your coffee cools.'],
['0:18', 'It draws its own ports too, so two full stacks run at once — neither one waiting, neither one sharing.'],
['0:28', 'Watch both panes. Two agents editing at full speed, and they cannot touch each other\'s files, because they are not in the same files.'],
['0:38', 'Git keeps the books cleanly — one repository, two working directories, both listed right there.'],
['0:47', 'Scale it up from here. Four agents, four worktrees, one repo — and not a single clone copied.'],
]

### how-it-works (120 words)

Explains linked checkouts, port provisioning, and why isolation falls out of
the design.

[
['0:00', 'Two agents are working the same repository at the same time, and the reason it works is a git feature worth knowing well — worktrees.'],
['0:09', 'The command creates a linked checkout — a second working directory sharing the same repository, on its own branch.'],
['0:18', 'Provisioning assigns it dedicated ports, which is what makes running both stacks simultaneously practical, not just possible.'],
['0:28', 'Isolation falls out of the design. Separate directories mean separate files — the agents physically cannot conflict.'],
['0:38', 'The worktree list shows the bookkeeping: one repository, one object store, several working directories.'],
['0:47', 'So parallel agents cost you one directory each instead of one clone each — the history is shared, the workspaces are not, and that is the whole trick.'],
]

### first-drive (122 words)

The viewer builds their own second lane and lets both agents loose.

[
['0:00', 'Look at both panes — two agents on two branches in one repository, and nobody is bumping elbows. You can set this up yourself in the next minute.'],
['0:09', 'Type the worktree command and watch it build you a second checkout — its own branch, its own directory, ready to work.'],
['0:18', 'It hands you fresh ports on the way out, so boot the second stack — the first one never even notices.'],
['0:28', 'Now let both agents loose at once. Different directories, different files — there is nothing for them to fight over.'],
['0:38', 'Run the worktree list and admire the bookkeeping — one repository, two working directories, everything accounted for.'],
['0:47', 'And tomorrow, make it four. Same repo, no clones, no waiting — all throttle.'],
]

## 17 — Chat with any CLI from the dashboard

beats: 0:00 0:09 0:17 0:25 0:34 0:44 0:52 · source: 17-chat-any-cli.md

Replay for the streamed responses — no take claims a model is answering during
the recording.

### payoff-first (122 words)

Opens on every CLI answering from one box, then banks the second-opinion and
kept-history payoffs.

[
['0:00', 'Every agent CLI you use, answering from one box. Claude, Codex, OpenCode — they are all right here in the picker, grouped and ready.'],
['0:09', 'Choose who answers, and everything else stays put. Same composer, same toolbar, same muscle memory.'],
['0:17', 'Ask about the repo you are standing in — the question goes straight to a tool that can actually see your code.'],
['0:25', 'It runs the real CLI on your machine — not a lookalike — and the answer streams back into the page.'],
['0:34', 'Want a second opinion? Switch tools and ask the exact same question — two experts, one desk.'],
['0:44', 'And both conversations are kept, side by side in the sidebar — tomorrow you pick up where you left off, not from scratch.'],
]

### how-it-works (118 words)

Explains the picker's contract — real local CLIs behind one constant
interface, threads persisted.

[
['0:00', 'The model picker is the whole idea — several agent CLIs, grouped by provider, sitting behind one composer you already know how to drive.'],
['0:09', 'Selecting one rewires who answers. Everything else in the interface stays constant, so switching costs you nothing at all.'],
['0:17', 'Your question runs with real context, because the conversation is anchored to the repository you are actually in.'],
['0:25', 'Under the hood it launches the actual CLI installed on your machine and streams its output straight back into the page.'],
['0:34', 'And because switching is free, comparing becomes natural. Same question, different engine, back to back in seconds.'],
['0:44', 'Every thread persists in the sidebar — the answers become a record you keep and come back to tomorrow.'],
]

### first-drive (122 words)

The viewer works the picker themselves — ask, switch, ask again, keep both.

[
['0:00', 'Open the picker and look at your options — Claude, Codex, OpenCode, every CLI you have installed, all parked in the same garage.'],
['0:09', 'Pick one and notice what changed — just the name in the toolbar. Your workspace stays exactly the way you like it.'],
['0:17', 'Now ask something real about this repo — the one on your screen, the one this tool can actually see.'],
['0:25', 'The actual CLI spins up on your machine, and the answer streams straight into the page.'],
['0:34', 'Curious what another tool would say? Flip the picker and ask the same question again — a second opinion in seconds.'],
['0:44', 'Check the sidebar — both threads saved, both answers kept. Your questions are quietly building a library you will use.'],
]

## 18 — Local models with Ollama: nothing leaves your box

beats: 0:00 0:09 0:18 0:26 0:34 0:41 0:50 0:56 · source: 18-ollama-local-models.md

Replay for the generated response. The 0:41 network-panel beat is the whole
video — every take gives it the punchline.

### payoff-first (120 words)

Opens on models with no meter, and lands the localhost receipt as the payoff.

[
['0:00', 'Every model on this screen is running on this laptop, right here in settings — no API key, no account, no meter running.'],
['0:09', 'Enable one, and it joins the composer picker like any hosted model would.'],
['0:18', 'Pick it exactly the way you pick anything else. Local is not a special mode — it is just another choice.'],
['0:26', 'Ask your question and watch the answer stream in. Same interface, same feel, top to bottom.'],
['0:34', 'Now the receipt. Open the network panel and filter the traffic.'],
['0:41', 'Every single request is localhost. Nothing left the machine — not the prompt, not the code, not the answer.'],
['0:50', 'Which means the most private codebase you own can use every bit of this, starting right now.'],
]

### how-it-works (121 words)

Explains discovery, registration, and the verifiable localhost path.

[
['0:00', 'These are Ollama models, discovered on this machine and listed in settings — no key because there is no cloud to key into.'],
['0:09', 'Enabling one registers it with the composer, in its own local group in the picker.'],
['0:18', 'From there, the interface treats it exactly like any other model. Selection, context, streaming — all identical.'],
['0:26', 'Prompts route to the local runtime, and responses stream back through the same pipeline hosted models use.'],
['0:34', 'The network panel is the proof, so open it up and filter the traffic.'],
['0:41', 'Localhost, every row. The prompt, the code, the response — all of it stayed on this machine, verifiably.'],
['0:50', 'Local inference as a first-class citizen — that is the design, and you just watched it hold.'],
]

### first-drive (122 words)

The viewer flips a local model on and checks the network panel with their own
eyes.

[
['0:00', 'These models live on your laptop. Look — settings, agents, and there they are, running locally, keyless and ready to go.'],
['0:09', 'Flip one on and watch it appear in your composer picker, right alongside everything else you use.'],
['0:18', 'Choose it exactly the way you would choose anything else. No ceremony, no special mode, no different workflow.'],
['0:26', 'Ask away. The answer streams into the page just like it always does.'],
['0:34', 'Now for the fun part — crack open the browser\'s network panel and filter the traffic down.'],
['0:41', 'All localhost, every row of it. Your prompt, your code, your answer — none of it went anywhere at all.'],
['0:50', 'Take that to the codebase you could never point at a cloud. The road is open.'],
]

## 19 — Skills: teach your agents your house rules

beats: 0:00 0:09 0:19 0:28 0:36 0:45 0:53 · source: 19-skills.md

### payoff-first (121 words)

Opens on the promise — teach every agent your way of working, exactly once.

[
['0:00', 'Your team\'s way of doing things, taught to every agent you run — and taught exactly once. That is what this catalogue holds.'],
['0:09', 'A skill is your rules written down one time, in a file your agents actually read — a short procedure, real commands.'],
['0:19', 'And it carries its own trigger. The skill says when to use itself, so the agent reaches for it without being told.'],
['0:28', 'Now try it from the composer. Ask for something the skill covers, in your own words.'],
['0:36', 'And watch the answer follow your procedure — your steps, your commands, your way of doing it.'],
['0:45', 'You decide where each skill applies, too. Per project, per tag — the rules travel exactly as far as you say.'],
]

### how-it-works (121 words)

Teaches the two-job anatomy — procedure plus trigger — and proves the
self-selection.

[
['0:00', 'A skill is a file with two jobs, and this catalogue is where they all live. Open one up and read it.'],
['0:09', 'Job one: the procedure. Your steps and your commands, written once, readable by every agent you run.'],
['0:19', 'Job two: the trigger. A description of when to use it — which is how agents pick it up on their own, no prompting required.'],
['0:28', 'Here is the proof. Switch to the composer and type a request the skill covers, phrased like any other ask.'],
['0:36', 'The response walks your procedure step by step, because the skill matched the request and loaded itself.'],
['0:45', 'And availability rules scope it — this project yes, that tag only — so knowledge lands exactly where it belongs.'],
]

### first-drive (120 words)

The viewer writes the house rules down once and watches an agent honor them.

[
['0:00', 'You know exactly how your team does things. Today you write it down once, and every agent you run learns it forever.'],
['0:09', 'Read this skill with me — a short procedure, real commands, plain words. That is the whole format.'],
['0:19', 'And this line is the magic — the trigger. The skill announces when it applies, so you never have to remember to mention it.'],
['0:28', 'Now go ask for something it covers, straight from the composer. Phrase it however you like.'],
['0:36', 'There it is — your procedure, followed to the letter, without you saying a single word about it.'],
['0:45', 'Then scope it your way. This project, that tag, everywhere at once — you draw the map of where your rules run.'],
]

## 20 — Generators: stop hand-writing components

beats: 0:00 0:08 0:16 0:26 0:35 0:44 0:51 0:56 · source: 20-generators.md

### payoff-first (121 words)

Opens on the two-second file and spends the minute on what made it free.

[
['0:00', 'Nobody typed this file. Two seconds of generator, and it came out with the right structure, the right imports, everything.'],
['0:08', 'The dashboard knows every generator this repo ships. Here is the catalogue.'],
['0:16', 'Open one and it hands you a real form — every option laid out, no help flag to decode.'],
['0:26', 'Tell it where the component lives and what it is called — the app, the folder, the name.'],
['0:35', 'Run it, and it delivers the whole set — the file, the test, the index export, all placed correctly.'],
['0:44', 'Yes, including the test — generated, wired up, and already waiting for your assertions.'],
['0:51', 'Same shape, every time, for every person and every agent on the team. That consistency is the entire point.'],
]

### how-it-works (122 words)

Explains discovery, schema-driven forms, and uniformity by construction.

[
['0:00', 'This component was generated, not written — and generated code is the fastest code you will ever review, because you already know its shape.'],
['0:08', 'The catalogue is discovered from the repo itself, so what you see is exactly what this workspace can scaffold.'],
['0:16', 'Opening a generator renders its options as a form. The schema drives the fields — nothing to memorize.'],
['0:26', 'You supply the decisions a template cannot make: the app, the folder, the name.'],
['0:35', 'Execution writes the full set — component, test, and index export — into the right places in the tree.'],
['0:44', 'The test comes standard. Scaffolding it is free, so it never gets skipped.'],
['0:51', 'And because the template is the source of shape, every component matches. Uniformity, by construction.'],
]

### first-drive (121 words)

The viewer scaffolds their own component and opens the free test.

[
['0:00', 'Look closely at this component. Correct structure, correct imports, correct everything — and it cost you two seconds. Want one of your own?'],
['0:08', 'Open the generators page. Everything this repo can scaffold is on the menu.'],
['0:16', 'Pick the one you need and read the form it hands you — every option visible on screen, nothing to go look up.'],
['0:26', 'Fill in your three answers — which app it belongs to, which folder, what name.'],
['0:35', 'Run it and watch the paths print — your file, your test, your export, all landed.'],
['0:44', 'Peek at the test file. It is already there, already wired — you just add the assertions.'],
['0:51', 'Do it again tomorrow and get the identical shape. Your codebase stays one codebase.'],
]

## 21 — The dashboard tour in 60 seconds

beats: 0:00 0:06 0:14 0:22 0:30 0:39 0:47 0:54 · source: 21-dashboard-tour.md

Per the source: six stops, no more, and the search stop is the header
commander — not the `/search` route. The three takes are structurally distinct
reads: a payoff pitch, a floor-plan tour, and a day-in-the-life.

### payoff-first (121 words)

A pitch, not a tour — each stop framed as the payoff it hands you.

[
['0:00', 'Everything your agents do lives one click from here. Six clicks, and you will have seen all of it.'],
['0:06', 'First payoff: you come back from lunch and the home panel has the whole story of what ran without you.'],
['0:14', 'Plans is where that work comes from — and starting the next one is one button from this list.'],
['0:22', 'Schedule is work you never think about again. Set the clock and collect results.'],
['0:30', 'Search takes half a thought — type it in the commander and it finds the real thing, by meaning.'],
['0:39', 'Skills is everything your agents know about how you like to work — inspectable, editable, yours.'],
['0:47', 'And settings holds the keys — you choose exactly which models get to run.'],
]

### how-it-works (120 words)

A floor-plan tour — six rooms, one job each, walked door by door.

[
['0:00', 'The dashboard is six rooms, and each room has exactly one job. Here is the floor plan, door by door.'],
['0:06', 'Home is the activity feed — every run, every change, everything your agents did, rolling in as it lands.'],
['0:14', 'Plans is the workshop. The work itself lives here, and new work starts here.'],
['0:22', 'Schedule is the clockwork — jobs bound to times, running whether or not you are around.'],
['0:30', 'Search is the memory. The commander matches on meaning, so half a thought is a full query.'],
['0:39', 'Skills is the rulebook — the procedures your agents follow when they work in your house.'],
['0:47', 'And settings is the garage — the models allowed to run are enabled, disabled, and governed right here.'],
]

### first-drive (123 words)

A day-in-the-life — the same six stops, ordered by the hours you would
actually visit them.

[
['0:00', 'Let me hand you a whole day with this dashboard, six stops long. Ready? Go.'],
['0:06', 'Morning, coffee, home panel — you read what your agents got done overnight before your first sip is gone.'],
['0:14', 'Mid-morning you open plans, pick up the thread, and kick off the next piece of work.'],
['0:22', 'The recurring stuff? You already put it on the schedule page — it runs itself while you build.'],
['0:30', 'After lunch you half remember a decision. The commander finds it from a fragment, by meaning.'],
['0:39', 'A new teammate asks how you do releases — you point them at skills, where the answer already lives.'],
['0:47', 'And when a new model drops, settings is where you flip it on. Six stops. That is your whole day.'],
]

## 22 — Self-host the whole thing on one box

beats: 0:00 0:09 0:19 0:27 0:37 0:46 0:54 · source: 22-self-host-docker-compose.md

Per the task note: the framing stays on what self-hosting unlocks, not on cost
or vendor avoidance. The compose file shown is the committed one.

### payoff-first (119 words)

Opens on the running instance and works back to the one file that carries it.

[
['0:00', 'This dashboard is running out of Docker on one box — the whole platform, standing up from one committed file. Yours to run anywhere you like.'],
['0:09', 'Scroll the services: the database, Redis, the API, the dashboard, and the MCP server. Everything in the stack, named in one place.'],
['0:19', 'One command, with the production profile, brings the whole set up together.'],
['0:27', 'Watch it sequence itself — it waits for the database, applies every migration, then starts serving traffic.'],
['0:37', 'And that is your own instance loading — your data, your machine, your network, your rules.'],
['0:46', 'Apache two licensed, top to bottom, no hosted account at any point. Run it on a laptop, a home server, or a box in your closet.'],
]

### how-it-works (119 words)

Explains the committed compose file as the architecture, and the ordered
startup that makes one command enough.

[
['0:00', 'Behind this dashboard is one Docker Compose file — committed to the repo, not conjured for the demo. Here is how it carries the whole platform.'],
['0:09', 'The service list reads like the architecture: database, Redis, the API, the dashboard, the MCP server. One file, the full topology.'],
['0:19', 'Compose up with the production profile — that is the entire ceremony, one line long.'],
['0:27', 'Startup is ordered on purpose. Health checks gate the database, migrations apply, and only then does serving begin.'],
['0:37', 'The result is a real instance on your own port — your data never lives anywhere you cannot point at.'],
['0:46', 'And the license is Apache two, so running it this way is not a loophole. It is the design.'],
]

### first-drive (120 words)

The viewer stands the platform up themselves and watches the checks go green.

[
['0:00', 'That dashboard in your browser? It is coming off a single box, and you are about to see everything behind it.'],
['0:09', 'Open the compose file and read the roster — database, Redis, API, dashboard, MCP server. Your whole platform on one page.'],
['0:19', 'Type the compose command with the production profile and hit enter — one line, all of it.'],
['0:27', 'Now watch the health checks flip green — database first, migrations applied on their own, then the services come alive in order.'],
['0:37', 'Load it up. That is your instance — your data on your machine on your network.'],
['0:46', 'It is Apache two licensed, so this box can be a laptop today and a rack tomorrow. Take it wherever you are going.'],
]

## L1 — OpenThrottle in 10 minutes: idea to plan to tasks to shipped commit

chapters: 1 @ 00:00 · 2 @ 01:10 · 3 @ 03:00 · 4 @ 04:30 · 5 @ 07:30 · 6 @ 09:20 · source: L1-idea-to-shipped-commit.md

Act four (04:30–07:30) is replay — the run is pre-baked by the demo seed, and
the 00:00 framing ("this took one afternoon") lets every take narrate it
honestly as the recorded run the plan kept. Cues own their own timings but
stay inside their chapter spans. The failing validation at 05:00 stays in —
per the source, it is the most persuasive thirty seconds in the video.

### payoff-first (1203 words)

Opens on the finished feature and spends ten minutes walking backwards through
everything that produced it — every chapter framed as a payoff being
collected.

[
['00:00', 'This is a finished feature. Six tasks, all complete, six commits sitting in the repository, and a plan that reads like the story of how they happened. The whole thing took one afternoon, and I typed almost none of it myself.'],
['00:20', 'Over the next ten minutes you will see the entire loop that produced it — starting from an empty plans list and an idea that exists only in my head, and ending with shipped, traceable code. Everything else on this channel is a sixty-second slice of some corner of it. This is the whole thing, watched whole.'],
['00:40', 'First, one picture worth keeping in mind. This is a chat thread from the old way of working — mid-conversation, with yesterday\'s context already gone, about to be explained all over again. Everything that follows exists so that this conversation happens exactly once, gets written down, and never needs repeating. That is the entire bet, and now you get to watch it pay.'],
['01:10', 'Here is move one, and it is the most important move in the whole video. Write the goal down somewhere every future run can read it. A new plan. A real title. And a description that says what we want and — more importantly — why we want it in the first place.'],
['01:35', 'Notice how plain the writing is. No template, no special syntax, no ceremony — it is the same brief you would hand a talented teammate on their first day, and that is deliberate.'],
['01:50', 'The moment this saves, the description stops being a message and becomes the brief. Every agent run on this plan — today, tomorrow, six weeks from now — starts by reading it. The context you used to repeat by hand is now infrastructure. You wrote it once, and from here on it stays written.'],
['02:20', 'One pointer finishes the setup — the project. It names a real checkout on disk, which means this plan is not talking about code in the abstract. It knows exactly which repository, which directory, which files we mean when we say the work. Records above, real code below, one pointer between them.'],
['02:45', 'Goal on the record. Code on the map. Two minutes in, the setup is finished for good, and the fun is about to start.'],
['03:00', 'Chapter two of the payoff: I do not type the task list. The agent is connected over MCP, and it already holds the brief — so I simply ask it to break the plan into tasks, in the same words I would use with a person.'],
['03:25', 'And it can do this well, because everything it needs is already sitting in the plan — the goal, the reasoning behind it, and the codebase the project points at. The brief is doing its job.'],
['03:40', 'There they are, written straight into the dashboard. Ordered, scoped to one idea each, and not a single one of them typed by me. The draft cost nothing, and it arrived already in the shape the runner needs.'],
['04:00', 'Then comes my part, and this division of labor is the quiet genius of the whole system. The machine drafts fast. I reorder one task, sharpen another\'s title, and delete a third outright — because judgment about sequence and scope is the part I am genuinely better at. Machine draft, human judgment, thirty seconds of my attention.'],
['04:30', 'Now the payoff you came for — the run itself. It works one task at a time, lowest first, and everything it does streams into the plan as it lands. What you are watching is the recorded run from that afternoon, replayed exactly as the plan kept it — which is itself a feature worth noticing, because every run you ever start is kept like this, forever.'],
['05:00', 'Watch this stretch closely, because it is the most persuasive half minute in the video. The agent wrote its code, then ran the validation behind it — lint, types, tests, the same gauntlet a human change faces — and the validation failed. Right there, on the record, in the stream.'],
['05:25', 'The checks are real, and that is exactly the point. A task cannot bluff its way past them, and neither can an optimistic summary.'],
['05:40', 'And here is the recovery. The agent read its own failure, went back into the code, and fixed it — no hand on the wheel, no one summoned to help. Only when the validation comes back green does the task actually close. Done has a definition here, and the definition is enforced.'],
['06:10', 'The moment one task shuts, the next one opens. Never two at once, ever. Which means any failure, at any point in the afternoon, is exactly one task wide — small enough to read, small enough to fix, small enough to run again without touching anything else.'],
['06:40', 'And notice what you are not doing — babysitting. The loop keeps its own books. Statuses flip, output streams, commits land, whether anyone is watching or not. That afternoon, I was making coffee.'],
['07:00', 'Six tasks, and the rhythm never changes — work, validate, close, commit, next. We will let the montage carry the middle of it, because you have already seen everything the middle would show you. The interesting parts are the edges, and we are coming to the best one.'],
['07:30', 'And here is what fell out the other end. A git log with six commits — and look closely at the footers, because this is my favorite payoff in the whole system. Every single commit names the plan and the exact task that caused it.'],
['07:55', 'Six changes, six reasons, stamped permanently into the history itself — no tooling required to read them, ever. It is just git.'],
['08:10', 'That footer is a return ticket. Copy the task id out of any commit — any commit, any age — and drop it into the dashboard, and the repository starts answering questions you used to ask in meetings.'],
['08:40', 'The task opens with everything attached — what was asked for, the state it finished in, and the plan it belonged to. One click up from there, and you are reading the original description. The one we wrote at minute one.'],
['09:05', 'From a line of code to the reason it exists, in thirty seconds flat, six months after everyone involved has forgotten the details.'],
['09:20', 'Two last payoffs before the loop closes. First, the receipts. Every run records the model it used and what it cost — in tokens and in money. So what this afternoon cost is a number on a screen you can read, not a feeling you defend in a budget conversation.'],
['09:50', 'Second, the deed to the whole machine. All of it runs on your hardware — local models through Ollama if you want them, the entire platform self-hosted from the compose file committed right there in the repo. The loop is yours, top to bottom.'],
['10:20', 'So that is the loop, complete. Write the goal down once. Cut it into tasks — machine draft, your judgment. Run them one at a time, with validation deciding what done means. And keep the trail, from every commit back to the why. You have an afternoon exactly like this one waiting for you — go spend it on the idea you keep putting off.'],
]

### how-it-works (1201 words)

Teaches the machine chapter by chapter — what a plan mechanically is, what the
loop enforces, why the trail survives — so the skeptic finishes able to
explain it to someone else.

[
['00:00', 'What you are looking at is a finished plan — six tasks completed, six commits landed, one afternoon of work. By the end of these ten minutes you will know exactly how every piece of it works, well enough to explain it to someone else.'],
['00:20', 'So we rewind to the actual beginning — an empty plans list. No records, no tasks, nothing for an agent to read. Just an idea in one person\'s head, which is where most ideas quietly stay. Everything you are about to see is the machinery that moves an idea out of a head and into a system that can act on it.'],
['00:40', 'For contrast, here is where that idea would normally go — a chat thread. Watch what the screen shows: the context from earlier in the conversation is gone, and the explanation is starting over. A chat is a stream. Nothing in it persists in a form the next run can use. That single mechanical fact is what this whole system is built around.'],
['01:10', 'So the first mechanism: a plan is a database record, not a document. When I create one, the title and description are not notes to myself — they are structured fields that every future agent run will load as its starting context, automatically, every single time.'],
['01:35', 'That is why plain language works here. The reader is an agent, and agents read prose better than they read templates. You are not filling in a form — you are briefing a worker.'],
['01:50', 'On save, the record exists — and now the description has a permanent job. It is the brief. Runs do not begin with a blank context window; they begin by reading this, automatically, as their first act. Which means the quality of this one paragraph quietly becomes the quality of every run that follows it. Worth two minutes of careful writing, wouldn\'t you say?'],
['02:20', 'Second mechanism — the project. A project is a pointer to a real checkout on disk, nothing more mysterious than that. Attaching it tells every run exactly which repository and working directory the plan\'s words refer to, so no run ever guesses. Records above, real code below, and this pointer is the load-bearing bridge between them.'],
['02:45', 'That is the entire data model you need to hold in your head for the rest of this video: a goal that persists as a record, and a map that leads to the code.'],
['03:00', 'Now the breakdown, and the third mechanism — MCP. The agent is connected to OpenThrottle as a tool server, which means it does not just chat about tasks. It can write them. I ask for a breakdown in plain English, and it calls the real task-creation tools.'],
['03:25', 'The output lands as records, not text — ordered tasks with titles and descriptions, sitting in the same database the plan lives in. Nothing needs copying out of a chat window, because nothing ever entered one.'],
['03:40', 'Here they are in the dashboard, one idea per task. That granularity is not a style preference — it is load-bearing, because the runner\'s guarantees are all denominated in tasks. Act four shows you exactly why.'],
['04:00', 'Fourth mechanism — the human pass. I reorder, retitle, and delete, and the system treats my edits as first-class input: the order I set here is the exact order the runner will execute, no interpretation in between. Machine speed for the draft, human judgment for the sequence, and the record permanently keeps both contributions.'],
['04:30', 'Now the loop itself, and this act is the recorded run from that afternoon, replayed from the plan\'s own stored output. The runner\'s first rule: exactly one task in progress at any moment. It takes the lowest unfinished task and gives it the whole machine.'],
['05:00', 'Here is the part that separates this from hope-based automation. After the work, validation runs — lint, types, tests. And in this run it failed. The stream records the failure verbatim, because the stream records everything.'],
['05:25', 'Note carefully what did not happen: the task did not close, and the loop did not advance. Done is a gate, not a claim — the single most important sentence in this video.'],
['05:40', 'The recovery is mechanical too. The agent reads its own failure output — which is sitting right there in its context — patches the code, and re-runs the validation. Green. Only now does the status flip to completed, because only now is it true.'],
['06:10', 'And the moment it flips, the next task opens. One at a time, always, which bounds the blast radius of any failure to a single task. Small tasks, hard gates, serial execution — three dull-sounding rules that compound into an afternoon you can trust.'],
['06:40', 'Everything you are watching writes itself to the database as it happens — statuses, output, commits, all of it. The record is a side effect of running, not a chore someone remembered to do afterward. That is why it is always complete and never embellished.'],
['07:00', 'The remaining tasks run the identical algorithm, so the montage loses nothing you have not already understood. Work, validate, gate, commit, advance. Five more times, five more clean landings.'],
['07:30', 'Now the output side. Six commits — and the mechanism that makes them special is in the footers. Each one carries two ids: the plan and the task that produced it. Structured metadata, embedded in ordinary git, readable by anything that can read a commit message.'],
['07:55', 'No plugin, no wrapper, no special client on the reading side. It is just git, carrying a little more truth per commit than it usually gets to.'],
['08:10', 'And because those ids name real records in a real database, they resolve. Paste a task id into the dashboard and the lookup simply works — the id in your git history is a foreign key into everything the system kept about that work.'],
['08:40', 'The task record opens with its full context: the ask, the final status, the parent plan. One level up sits the plan description — the brief from minute one of this video, still attached to everything it went on to cause.'],
['09:05', 'That is the full chain: commit, to task, to plan, to intent. Every link in it is a record rather than a convention, which is why every link survives staff turnover, tool changes, and time.'],
['09:20', 'Last mechanisms, quickly. Every run logs the model it used and its token cost as plain data on the run record. Cost accounting falls out of the architecture instead of being bolted on — you query what an afternoon cost, you do not estimate it.'],
['09:50', 'And the whole machine is inspectable for the best possible reason — you own it. Local models route through Ollama on your own hardware when you want them to, and the entire platform stands up from the compose file committed in the repo. There is no part of what you just watched that you cannot open up, read, and run yourself.'],
['10:20', 'So now you know how it works. A goal that persists as a record. Tasks scoped small and executed one at a time, behind a validation gate. Commits that carry their own provenance. And receipts for all of it. Simple mechanisms, honestly composed — that is the whole machine.'],
]

### first-drive (1205 words)

Rides the whole afternoon in second person — the viewer's idea, the viewer's
hands, one continuous drive from blank page to shipped commits.

[
['00:00', 'Here is where you are going to be by the end of this video: six tasks done, six commits shipped, one plan telling the whole story of how — an afternoon of real work where you barely touched the keyboard. Let me hand you the keys and take you around the track one full lap.'],
['00:20', 'You start here, at an empty plans list. You have an idea — the real one, the one you have been carrying around for weeks — and right now it lives nowhere but your head. In the next two minutes it gets a home.'],
['00:40', 'You have seen this screen before too — a chat thread, the one on screen right now, where the context you carefully explained is gone again by the next session. Hold that feeling for just a second, because the very next thing you do makes it obsolete for good. From here on, you write things down once, and once is enough.'],
['01:10', 'Make your first move. New plan. Type the title like you mean it, and then write the description — what you want built, and why you want it built. Talk to the page the way you would talk to the sharpest teammate you ever had, because that is exactly who is going to read it.'],
['01:35', 'Do not dress it up. Plain words, real intent, the reasons included. Two minutes of honest writing is all this takes, and no two minutes of your afternoon will earn you more.'],
['01:50', 'Hit save and feel what just changed: that paragraph is now the brief. Every agent run you ever start on this plan reads it first — today, next week, the week you get back from vacation with the whole thread gone cold. You will never explain this idea from scratch again, to anyone or anything, and you only had to write it down once.'],
['02:20', 'Now point the plan at your code. Attach the project — the actual checkout on your disk — so every run knows exactly which repository and which directory you mean. Your words upstairs, your codebase downstairs, and now they are connected for good.'],
['02:45', 'That is your whole setup, start to finish. Two minutes flat, and you never have to do any of it again for this plan, ever.'],
['03:00', 'Time to break the work down, and here is the fun part — you do not write the task list. Your agent is connected over MCP, and it has already read your brief, so it knows what you are building and why. Just ask it, in your own words: break this plan into tasks.'],
['03:25', 'It writes them straight into the dashboard while you watch. Real tasks, in order, one idea each — records in your system, not suggestions in a scroll.'],
['03:40', 'Look over the list it made. Pretty good, right? Not perfect, though — one is out of order, one is fuzzy, and one plainly does not belong. That is your cue to step in.'],
['04:00', 'Now you drive. Drag that task up the list — sequence matters, and you are the one who knows this codebase. Sharpen this title until it says the thing. Delete the one that does not belong at all. Thirty seconds of your judgment layered onto its draft, and the plan is better than either of you would have written alone.'],
['04:30', 'Now start the run, and watch what your afternoon looks like from the passenger seat — this is the recorded run, replayed exactly as the plan kept it, every line preserved. One task goes in progress. Just one, and that is a promise the runner keeps all day. The stream below starts carrying every line of the work as it lands.'],
['05:00', 'Keep your eyes on this part, because it is the part that earns your trust. The agent wrote its code, kicked off the validation — lint, types, tests — and failed. Right on the record, right in front of you.'],
['05:25', 'Feel that? No cover-up, no cheerful summary claiming success. The gate held, exactly the way you would want it to hold at two in the morning.'],
['05:40', 'Now watch it recover, because this is the good part. It reads its own failure output, goes back into the code, patches, and re-validates — green this time. And only now does the task close. You did not touch a thing. You just watched done get earned instead of declared.'],
['06:10', 'The next task opens the very second the last one shuts. One at a time, every time, no exceptions — so if anything ever goes sideways, it goes sideways exactly one task wide, and you fix one small task instead of untangling an afternoon.'],
['06:40', 'And here is your move during all of this: none at all. Go make coffee. Go start the next idea. The loop keeps its own records whether you watch or not — the proof is that you are reading those records right now, after the fact, and missing nothing.'],
['07:00', 'Five more tasks run the exact same lap — work, validate, close, commit, next. Let the montage roll and enjoy the view; you already know every turn of the track.'],
['07:30', 'Now come collect your winnings. Open the git log and look at what your afternoon left behind. Six commits — and read the footers on them. Every single one names your plan and the exact task that produced it. Your repository history just became self-documenting, and you did nothing extra to make that happen.'],
['07:55', 'No extra tooling, no discipline you have to remember on your best behavior. It is just git, telling the truth about where every change came from.'],
['08:10', 'Now try the return trip yourself. Copy a task id out of any commit — pick whichever one you like — and paste it into the dashboard search. Go on. This is the part that gets people.'],
['08:40', 'There is the task — the ask, the final status, the plan sitting above it. Click up once and you are reading your own brief from minute one of this video, still attached to everything it caused all afternoon.'],
['09:05', 'Six months from now, you will make this walk in thirty seconds — commit, task, plan, why — and you will grin every single time it works.'],
['09:20', 'Before you go, open the receipts. Every run logged the model it used and what it cost — tokens and money, per run, no guessing anywhere. You know exactly what this afternoon cost you, down to the run, and it is less than you think.'],
['09:50', 'And remember — this entire machine is yours to keep. Run local models through Ollama if that is your style, so nothing ever leaves your box. Stand the whole platform up from the committed compose file, on your laptop today or your own server tomorrow. Every part of what you just drove, you own outright.'],
['10:20', 'That is the loop, and now you have driven it yourself. Write your goal down once, where every run can read it. Let the agent draft the tasks, then apply your judgment where it counts. Run them one at a time behind a real validation gate. Keep the trail forever. Your idea is still sitting in your head — go give it an afternoon exactly like this one.'],
]

## L2 — OpenThrottle setup from scratch: clone to running in one sitting

chapters: 1 @ 00:00 · 2 @ 00:50 · 3 @ 02:10 · 4 @ 04:00 · 5 @ 05:20 · 6 @ 06:30 · 7 @ 08:00 · source: L2-setup-from-scratch.md

Recorded live on a genuinely clean machine, per the source — and the install
wait is never compressed or waved away. Chapter 7's two failure demos are
narrated as the viewer's toolkit, not as warnings. Cues own their timings but
stay inside their chapter spans.

### payoff-first (1201 words)

Opens on the finished dashboard and treats every chapter as a milestone
collected on the way back to it.

[
['00:00', 'This dashboard is the destination — the whole platform, running on your own machine, with nothing shared and nothing uploaded anywhere. Getting here takes about ten minutes, and most of those minutes are waiting rather than working. Here is the entire road, start to finish.'],
['00:20', 'Three green lights before you start the engine, and you can check all three in the time it takes to read them. Node twenty-two or newer, because that is what the platform runs on. Pnpm, because it manages the workspace. And Docker, up and running, because that is where your databases are about to live.'],
['00:40', 'If any of the three is missing, install it now and meet us at the next chapter — the video will still be here, and so will the payoff.'],
['00:50', 'Milestone one: the code. Clone the repository and step inside it. This is one repo with everything in it — the API, the dashboard, the database schema, the tooling, all of it versioned together. One clone, and you are holding the entire platform in a single directory on your own disk.'],
['01:05', 'That single-directory fact pays off all video long — every command from here on runs from this one place, and nothing ever asks you where anything else lives.'],
['01:20', 'Milestone two: the install. This resolves every application and every package in the workspace as one dependency tree, and it is the long wait — the only real one in the entire setup. So start it, and let it run at its actual speed, because this video does not pretend setup is faster than it is.'],
['01:50', 'We cut away while it worked and came back the moment it finished. That was the one big wait of the day, and it is already behind you — everything from here on moves fast.'],
['02:10', 'Milestone three, and it is the biggest one: a single script builds your entire environment. Databases, migrations, and a login, all from one command — and the best part is you get to sit back and watch each piece land in order.'],
['02:25', 'Keep your eyes on the output — it narrates itself as it goes, and each line it prints is a thing you will never have to do by hand.'],
['02:40', 'First it brings up Postgres and Redis in containers, each on its own dedicated port. That isolation is a gift that keeps giving: they sit happily next to anything you already run, today and forever. No port collisions, no surprises for the rest of your machine, nothing to configure by hand.'],
['03:05', 'Watch the health checks flip green, one after the other. That is real infrastructure — a database and a cache, alive and answering on their own ports — thirty seconds into one script.'],
['03:20', 'Then every migration applies, in order, off a recorded ledger. And here is a detail worth loving about this script: run it twice, and nothing happens twice. It remembers what it has already done, which means this command is always safe — on a fresh machine, an old checkout, any day of the week.'],
['03:50', 'And there it is — a seeded login, created for you. You have an account before you have even seen the app.'],
['04:00', 'Milestone four: ignition. One more command starts the whole stack, and this is the last thing you type before the browser takes over.'],
['04:15', 'Everything you watched the setup script build is about to come alive at once — and in the right order, without you ordering it.'],
['04:30', 'The API climbs first, and the dashboard deliberately waits for a healthy API before it serves a single page. That boot order is handled for you, every time, on every start — there is nothing to sequence, nothing to remember, and nothing to babysit. Watch the ports come alive on their own.'],
['05:00', 'Take stock of the scoreboard: two commands and one script. That is everything you have typed since the video began, and the entire stack is up and serving.'],
['05:20', 'Milestone five is the one you will remember. Open the browser, and the login form is already filled in with the seeded account from a minute ago. Sign in — this is the exact moment ten minutes of terminal output turns into a product with your name on it.'],
['05:50', 'It is empty in there, and that emptiness is the feature. This instance is yours alone — nothing was uploaded, nothing was shared, and nobody else has an account here. Every record it will ever hold is one you choose to create.'],
['06:00', 'Take one lap around the sidebar before we move on — plans, schedule, skills, settings. Every one of these rooms now belongs to you.'],
['06:10', 'So give it its first record right now. One plan, one task — and just like that, the dashboard has something real to show, and you are the one who made it.'],
['06:30', 'The final milestone is the one that makes every step before it pay off: wiring your agent into the platform. One command prints the exact MCP block your agent needs — generated from your actual install, not copied from a stale wiki page somewhere.'],
['06:50', 'This one block is the difference between a dashboard you visit and a platform your agent works inside — which is the whole reason you came.'],
['07:00', 'Paste that block into your agent\'s MCP config, save the file, and restart the agent so the server loads at startup. That is the entire wiring job, all of it — one copy, one paste, one restart, and your agent is connected.'],
['07:15', 'While it restarts, appreciate what you just bought: from now on, plans your agent writes land in your dashboard, and plans you write brief your agent.'],
['07:30', 'Now collect the proof. Ask your agent what plans exist — and it answers with the exact plan you made two minutes ago, read straight out of your own database. Your agent and your dashboard are looking at the same brain now. You are officially done.'],
['08:00', 'Before you go, take the toolkit — the two fixes that cover nearly every setup that ever stumbles, anywhere. First: if the API cannot reach the database, it looks exactly like this — remember the shape of this error. The fix is one command: bring the containers back up.'],
['08:25', 'And watch it heal, immediately, because everything else was healthy the whole time. One command, and you are back on the road.'],
['08:40', 'Second: a stale environment file, which announces itself exactly like this. Also a one-command fix — reset it and carry on. Two symptoms, two one-line cures, and you have now watched both of them work on a real screen, start to finish.'],
['09:05', 'That is the entire troubleshooting chapter. Short, isn\'t it? That brevity is earned.'],
['09:12', 'Everything else in this stack tells you plainly what it wants — you have seen its two moods already.'],
['09:20', 'And that is a complete local install — the same dashboard from the very first frame, now running on your hardware. No account created anywhere but here, no sign-up, nothing leaving your machine — and a login your agent already shares with you.'],
['09:45', 'Ten minutes, most of them spent waiting on one install. The keys are yours now — go make the first plan you actually care about.'],
]

### how-it-works (1218 words)

Explains what each step actually does — ports, the migration ledger, the seed,
the boot order, the MCP wiring — so the viewer understands the machine they
just assembled.

[
['00:00', 'By the end of this video, this dashboard runs on your machine — and more usefully, you will know what every single step of the setup actually did, which is the difference between installing something and owning it. The whole thing takes about ten minutes, and most of that is waiting.'],
['00:20', 'The prerequisites are three, and each one has a specific job worth knowing. Node twenty-two or newer is the runtime the whole platform executes on. Pnpm manages the workspace — this is a monorepo, built specifically around pnpm\'s workspace features. And Docker hosts the databases, so nothing heavyweight ever installs onto your machine directly.'],
['00:40', 'Three tools, three layers — runtime, workspace, infrastructure. Every step that follows uses exactly one of them, and now you can tell which.'],
['00:50', 'The clone hands you one repository holding everything — the API, the dashboard, the database schema, and the tooling that ties them together. That is a deliberate architectural choice: one checkout is the whole system, versioned as a unit, so no part of your install can ever drift out of step with another.'],
['01:05', 'A monorepo also means one install and one setup path — the structure you just cloned is the reason the next two chapters are so short.'],
['01:20', 'The install resolves the entire workspace — every application and every package, one coherent dependency tree, downloaded and linked once. It is the longest step in the whole process, and we are letting it run at its genuine speed on screen, because an honest setup video is the only kind worth following along with.'],
['01:50', 'Back after the wait, and here is why everything from this point on moves quickly: the dependency work is finished, once, up front. Nothing later in this video waits on a download again.'],
['02:10', 'Now the setup script, and this is where understanding really pays off. One script owns the entire environment, and it performs three distinct jobs in a fixed order — infrastructure, then migrations, then the seed. Watch for each one as it goes by, because each one teaches you something about the system.'],
['02:25', 'The fixed order is itself information: each job depends on the one before it, and the script encodes that dependency so you never have to think about it.'],
['02:40', 'Job one: infrastructure. Postgres and Redis start in containers, each bound to its own dedicated port rather than the defaults — which is precisely why they coexist with anything else you already run. The isolation is the point of the design: your other projects never notice these exist, and these never notice yours.'],
['03:05', 'Health checks gate everything that follows. The script does not move on until both databases genuinely answer — not merely started, but ready.'],
['03:20', 'Job two: migrations, applied in order off a ledger that records exactly what has already run. That ledger is what makes the script idempotent — run it twice, and nothing happens twice, because it checks before it acts. Idempotent setup means this command is permanently safe: fresh machine, old checkout, any state in between.'],
['03:50', 'Job three: the seed. It creates a working login, which is why your first boot lands on an account instead of an empty users table.'],
['04:00', 'Starting the stack is a single command, and the genuinely interesting part is the dependency logic running underneath it.'],
['04:15', 'One command fans out into every service the setup script prepared — and the fan-out is ordered, which is the detail to watch for next.'],
['04:30', 'The API boots first because the dashboard depends on it — and the dashboard actively waits for a healthy API before it serves anything at all. That ordering is encoded in the tooling rather than remembered by you, which is why the stack starts correctly every single time, on every machine, without ceremony.'],
['05:00', 'Ports, health, boot order — every operational decision so far was made for you, and every one of them is visible in the output if you ever want to read it.'],
['05:20', 'The login form arrives prefilled with the seeded account — the one job three created a few minutes ago. Sign in, and you are through the front door of your own instance.'],
['05:50', 'The dashboard is empty for a structural reason worth understanding: this is a private instance. There is no shared backend behind it, no sample data pulled from a cloud — every record this database will ever hold is one that you, or an agent you wire in, deliberately creates.'],
['06:00', 'That is also your data-privacy story in one sentence: the database you just watched start in a container is the only place any of this ever lives.'],
['06:10', 'So create the first one now. A plan with a single task — the smallest complete record the system has, and the test data for what comes next.'],
['06:30', 'Now the agent wiring, and the mechanism matters here. Your agent connects over MCP — the protocol agents use to talk to tool servers — and this command prints the exact configuration block for it, generated live from your actual install rather than copied from documentation that might have aged.'],
['06:50', 'Generated config is a small mechanism with a big consequence: the ports and paths in that block are the ones your install actually uses, so it cannot be wrong.'],
['07:00', 'The block goes into your agent\'s MCP configuration file. Agents load their tool servers once, at startup — which is why the restart is a required part of the procedure and not a superstition someone passed along.'],
['07:15', 'After the restart, the agent holds a live connection to your instance — every tool the server exposes is now part of the agent\'s vocabulary.'],
['07:30', 'The verification is a genuine round trip through every layer. Ask the agent what plans exist: to answer, it must call the MCP server, which queries your Postgres, which returns the plan you just made. If the answer comes back, the agent, the server, and the database are all provably working together.'],
['08:00', 'Last chapter: the two failure modes actually worth knowing, because understanding them makes you fully self-sufficient. The first is the database not running — and this is exactly what it looks like on screen, so you will recognize it in a second flat. The fix is one command: start the containers again.'],
['08:25', 'Watch the recovery — instantaneous, because every other layer of the stack was healthy the entire time and simply waiting.'],
['08:40', 'The second is a stale environment file — this is its exact signature, and one command resets it to a known-good state. Notice that both failures share one shape: a clear, recognizable symptom, a single-command fix, and no mystery in between the two. That shape is deliberate.'],
['09:05', 'Those two fixes cover nearly every setup that ever stumbles. They are yours now, and you understand why they work.'],
['09:12', 'And both fixes trace back to mechanisms you watched earlier — containers you can restart, and an environment file the setup script owns.'],
['09:20', 'And that is the complete picture — a local install you understand top to bottom. Isolated databases on their own ports, a ledger of migrations that can never double-apply, a seeded login, an ordered boot, and an agent wired in over MCP. No account, and nothing leaving your machine.'],
['09:45', 'Ten minutes, and none of it is magic to you anymore. Drive it like you built it — because you did.'],
]

### first-drive (1206 words)

A true follow-along — the viewer types every command in a second window and
arrives at their own running instance.

[
['00:00', 'Open a terminal right next to this video, because this one is a follow-along — you type what I type, and by the end you have this exact dashboard running on your own machine. Ten minutes, most of it waiting, and you get to the good part today, in one sitting.'],
['00:20', 'Quick gear check before we roll, and type these with me. Node twenty-two or newer — check the version. Pnpm — check it. Docker — make sure it is actually running, not just installed. Three green lights on your screen, and I promise you the rest of this ride goes smoothly.'],
['00:40', 'Missing one? Pause me, grab it, and come right back — this video will wait for you, and the destination is worth it.'],
['00:50', 'Now clone the repository and hop inside it. Take a second to appreciate what you are holding: one repo with everything in it — the API, the dashboard, the schema, the tooling. The same code that runs the dashboard you saw in the first frame is now sitting on your disk.'],
['01:05', 'From this directory, every single command in the rest of the video runs. You never leave home again.'],
['01:20', 'Kick off the install and go refill your coffee — genuinely, go. This is the one real wait of the day, and we are not going to pretend otherwise: it is running at full, honest speed on this screen too, no editing tricks, no sped-up footage.'],
['01:50', 'Welcome back. That was the entire wait — the only long one in the whole video — and everything from here on moves quickly precisely because of what just finished downloading.'],
['02:10', 'Now type the best command of the day: the setup script. Then take your hands off the keyboard and just watch, because databases, migrations, and your own login are all about to be handled for you, in order, while you sit there.'],
['02:25', 'Read the output as it scrolls — every line it prints is a chore you are watching disappear from your life.'],
['02:40', 'There go Postgres and Redis, standing up in containers on their own dedicated ports. Everything else you run on this machine keeps running exactly as it was — these two stay out of everyone\'s way, permanently, and you never had to pick a port or edit a config to make that true.'],
['03:05', 'Green health checks, one and two. You have real infrastructure now — a database and a cache, alive and answering. You have typed exactly one command in this chapter.'],
['03:20', 'Now the migrations roll through, every one of them, and here is something to file away for later: this script keeps a ledger of what it has run, so you can run it again any time and nothing will happen twice. A setup command that is always safe to repeat — keep that in your pocket.'],
['03:50', 'And look at that line right there — it just made you an account, credentials and all. You have a login before you have even laid eyes on the app.'],
['04:00', 'Time for ignition. Type the start command with me — it is the last thing you type before the browser takes over the show.'],
['04:15', 'Everything the setup script built is about to wake up together — and you get to just watch it happen.'],
['04:30', 'Now watch the boot happen: the API rises first, and the dashboard politely waits for it to be healthy before serving a single page. You are not managing that order — it manages itself, every time you start the stack, today and every day after.'],
['05:00', 'Check the scoreboard with me: two commands and one script. That is the complete list of everything your hands have done since this video started. Not bad for a platform.'],
['05:20', 'Now for the payoff. Open your browser — and would you look at that: the login form is already filled in with your seeded account. Hit submit and walk through the front door of a platform that did not exist on this machine fifteen minutes ago.'],
['05:50', 'Look around for a second. It is empty in here, and it is empty because it is yours — nothing uploaded, nothing shared, no other users anywhere. This is a blank page with your name on it, waiting to see what you do with it.'],
['06:00', 'Click through the sidebar once, just to feel the size of the place — plans, schedule, skills, settings. All yours, all running off your own machine.'],
['06:10', 'So put the first mark on it yourself. Make a plan, give it one task. There — your instance has its first real record, and you made it by hand, which makes what happens next much more fun.'],
['06:30', 'One more move, and this stops being a demo and becomes a tool you use every day. Run the instructions command and copy the block it prints — that is your agent\'s wiring, generated for your exact install, ports and all. No hunting through docs for it.'],
['06:50', 'Copy it exactly as printed — it already knows your ports and your paths, because your own install generated it.'],
['07:00', 'Paste it into your agent\'s MCP config, save the file, and restart the agent so it picks the server up. Copy, paste, restart — three moves, and you have done harder things before breakfast.'],
['07:15', 'While the agent restarts, take a breath and realize what you have built in ten minutes — a platform, a login, and a wire between your agent and both.'],
['07:30', 'Now for the moment of truth, and I want you to type this one yourself. Ask your agent what plans exist. And there it is — the plan you made two minutes ago, read straight out of your own database by your own agent. You two are connected now, for good.'],
['08:00', 'Before you go, let me hand you the toolkit that keeps you self-sufficient forever. If the database is ever not running, it looks exactly like this — study the shape of that error for a second. The fix is one command: bring the containers back up. That is the whole repair.'],
['08:25', 'And watch it heal, instantly, because everything else stayed healthy the whole time it was down. That is fix number one, and it is yours to keep now.'],
['08:40', 'Fix number two: a stale environment file looks exactly like this, and one command resets it clean. That is the entire toolkit — two symptoms, two one-liners, both of which you have now watched work on a real screen with your own eyes.'],
['09:05', 'Anything beyond those two, the docs and the community have your back — but those two cover almost everyone, almost always.'],
['09:12', 'And notice you fixed both without leaving the terminal you started in — that self-sufficiency was the point of doing this from scratch.'],
['09:20', 'And there you are — back at the dashboard from the very first frame, except this one is yours. Your machine, your login, your first plan already inside it, and your agent wired in and answering. No account was created anywhere on earth except right here.'],
['09:45', 'You did the whole thing in one sitting, and most of the effort was one coffee refill. Now go make the plan you actually came here to build — the road is wide open in front of you.'],
]
