# OpenThrottle — Vision

> **OpenThrottle is an agentic orchestration harness.** It takes the best tools, patterns, and industry practices for getting work done with AI agents and packages them into one self-hostable system: a web UI, a GraphQL + WebSocket server, an MCP surface, and an execution loop — all deployable on a single box and owned entirely by you.
>
> _This is the canonical statement of where OpenThrottle is going. It is mirrored into the OpenThrottle Roadmap plan (OT plan `ce7e2773-3c71-4e8f-8229-11355d021723`), which tracks the prioritized work that gets us there. When the two disagree, this file is the intent; the plan is the schedule._

---

## The north star

Software teams are drowning in half-integrated agent tooling: one tool to plan, another to chat, a third to run agents, a fourth to remember what happened, none of them talking to each other, most of them someone else's cloud. The result is agents that forget, work that isn't traceable, and a planning layer that lives in a dozen tabs.

**OpenThrottle is the harness that ties it together.** It is the place where an idea becomes a plan, a plan becomes tasks, tasks become agent runs, and agent runs become traceable, shipped commits — with the whole history searchable and the whole thing running on infrastructure you control.

We are not building another chat wrapper or another issue tracker. We are building the **orchestration layer** that sits between human intent and agentic execution, and we are building it the way it tells you to build software: generated, typed, tested, and observable.

Three commitments define it:

1. **Best-of-breed, assembled.** We don't reinvent; we curate. The best agent loop (Ralph), the best planning substrate (plans/tasks/notes with semantic memory), the best interfaces (MCP, GraphQL, WebSockets, a real web UI, an editor extension) — integrated into one coherent system instead of a pile of point tools.
2. **Self-hostable and sovereign.** OSS-first. Your plans, your code context, your model choices, your box. A single Docker stack gets you running; nothing leaves your perimeter unless you choose it to. Local models (Ollama) are a first-class path, not a fallback.
3. **Traceable end to end — both directions.** Forward: a plan becomes tasks, tasks become agent runs and output, and output lands in the commit that shipped it. Backward: the harness continuously tracks the codebase and its git history and maps every commit back to the task, plan, and output that produced it. So you can ask "what shipped this plan?" and "why does this code exist?" with equal ease — the intent and the implementation stay linked as the repo moves, all queryable in natural language.

---

## What "agentic orchestration harness" means

A harness is the structure that lets many moving parts pull in the same direction safely. OpenThrottle's harness has four faces:

- **A planning substrate** — plans, tasks, notes, and projects as durable, queryable objects (not Markdown scattered in a repo). This is the unit of work agents and humans share.
- **An execution loop** — turn an idea or PRD into a plan + tasks, then drive them one task at a time to completion, with progress streamed and commits traced back. Today this is **Ralph**.
- **A memory** — semantic search (pgvector) across plans, tasks, and ingested docs, plus an activity/timeline view of what was worked on and what shipped. The harness doesn't forget.
- **Open interfaces** — the same substrate reachable from an MCP client (any agent host), a GraphQL + WebSocket API, a web UI, a CLI, and a VS Code extension. Bring your own agent, bring your own editor.

---

## Where we are today (honest current state)

OpenThrottle is real and running, but uneven — strong in the substrate and the loop, thinner in the surfaces and the self-host story. A clear-eyed inventory:

| Capability                       | State                 | Notes                                                                                                                                                                                                                         |
| -------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plans / tasks / notes / projects | **Solid**             | Postgres-backed, full lifecycle, MCP + GraphQL CRUD. The substrate works.                                                                                                                                                     |
| Agentic execution (Ralph)        | **Working**           | Idea/PRD → plan → tasks → one-at-a-time execution, BullMQ queue, worktrees, commit traceability via `Plan-Id`/`Task-Id`. Rough edges in orchestration & resumability.                                                         |
| Commit ↔ task reconciliation     | **Partial**           | `commit_links` maps SHAs → plan/task (forward + sha-level reverse queries, manual `linkCommit`). Continuous ingestion, file-level mapping, output linkage, and rebase/squash drift handling are the gap (OT plan `03dbeb22`). |
| Semantic search & docs ingest    | **Working**           | pgvector over plans/tasks/docs via one MCP. Cross-source ranking and a unified timeline are still gaps.                                                                                                                       |
| MCP surface                      | **Solid**             | The OT MCP is the most mature interface; it's how agents touch the harness today.                                                                                                                                             |
| Web UI (developer)               | **In progress**       | React Router app: dashboards, activity, local-model chat composer. Many flows still to build.                                                                                                                                 |
| Real-time (WS / notifications)   | **Emerging**          | graphql-ws plumbing + notifications designed; streaming output landing; user-scoped delivery not yet complete.                                                                                                                |
| Admin / email / website apps     | **Early**             | Scaffolded; not the focus yet.                                                                                                                                                                                                |
| Self-host / deploy               | **Designed, partial** | Single-box Docker + Caddy on a GCP E2 designed; licensing & first-time onboarding sketched. Not yet a one-command, anyone-can-run experience.                                                                                 |
| Model flexibility                | **Partial**           | Ollama discovery + hosted embeddings exist; agent-backend and model selection not yet unified.                                                                                                                                |

**The gap, stated plainly:** the engine and the memory are good; the _product_ — the deployable, onboardable, multi-surface experience an external team could pick up and self-host — is the work ahead.

---

## Themes (the pillars the roadmap breaks down into)

Each theme is a durable pillar of work. The roadmap plan turns these into concrete, sequenced plans; this section is the stable index of _what kinds of work matter and why_.

### 1. Orchestration Engine

The heartbeat: idea/PRD → plan + tasks → execute → traceable, merged commits. Make Ralph and the queue/worktree machinery robust, resumable, observable, and backend-agnostic (Claude, Cursor, others). _Why: this is the differentiator — everything else serves the loop._

### 2. Institutional Memory

Semantic search and the story-over-time. Unify cross-source ranking (plans + tasks + docs + commits), build the activity/timeline surface, and — the mirror image of the execution loop — continuously reconcile the codebase and git history back onto the plans, tasks, and outputs that produced them, so intent and implementation stay linked as the repo moves. Make "ask OT what happened" trustworthy. _Why: a harness that forgets is just tooling; memory is what compounds._

### 3. Open Interfaces

Meet developers where they are: a polished web UI, the MCP surface, GraphQL + WS API, a CLI, and the VS Code extension — all over the one substrate, none of them second-class. _Why: adoption follows reach; bring-your-own-agent/editor is the wedge._

### 4. Real-time Fabric

WebSockets, streaming plan output, and notifications so you watch agents work live and get told when something needs you. _Why: agentic work is long-running; visibility and interruptibility are table stakes._

### 5. Self-Host & Operate

The "anyone can run this" story: one-command (or close) Docker deploy, sane defaults, first-time onboarding, licensing, and a path from single-box to scale-out. Local models as a first-class privacy path. _Why: sovereignty is the promise; if it's hard to run, the OSS thesis fails._

### 6. The Substrate Itself

OpenThrottle is built the way it tells you to build: Nx generators, code-first GraphQL + codegen, typed boundaries, testing discipline, and reusable skills. Keep dogfooding and harden the foundation. _Why: credibility — the harness should embody the practices it orchestrates._

---

## Principles

- **Curate, don't reinvent.** Adopt the best pattern; integrate it well.
- **Plans live in OT, not in files.** The substrate is the source of truth.
- **Generated, typed, tested.** No hand-rolled where a generator exists; no `any`; no untested surface area.
- **Traceable or it didn't happen.** Work links to plans, tasks, output, and the commit that shipped it.
- **Sovereign by default.** Self-host first; your data and model choices stay yours.
- **One substrate, many surfaces.** Every interface reads and writes the same plans/tasks/memory.

---

## How this drives the roadmap

1. **This file** sets intent — the north star, the themes, the principles.
2. **The roadmap plan (`ce7e2773`)** holds the live prioritization: Now / Next / Later, drawn from the themes above.
3. **Each committed initiative** becomes its own OT plan with tasks, executed (often by Ralph) and traced back to commits.

The next step from here is to break each theme into one or more concrete plans and slot them into Now / Next / Later.

---

_Last updated: 2026-07-02_
