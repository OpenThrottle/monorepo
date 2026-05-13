# Research: HTML over Markdown for Ralph agent workflow

**Status:** In progress (skeleton). **Plan:** `78e34f99-35a0-41e3-9c29-fa4c8b4a5ca4`.

This document tracks exploration of using HTML (alongside or instead of Markdown) as a primary surface for agent outputs and human review in the OpenThrottle Ralph stack. **No functional or schema changes** are in scope for this research artifact—only analysis and recommendations.

---

## TL;DR

_(To be filled after synthesis of background, inventory, and evaluation.)_

- One-paragraph verdict on whether to invest in HTML-rich surfaces for OT/Ralph.
- Pointer to the recommended phased rollout or explicit “not now.”

---

## Background and sources

_(Task: summarize thesis, caveats, and citations.)_

### Primary references

- _(Placeholder)_ Thariq Shihipar (@trq212) — [X post](https://x.com/trq212/status/2052809885763747935) on HTML vs Markdown for agent output.
- _(Placeholder)_ Secondary coverage (e.g. Techmeme, stable-learn.com, Anthropic first-party posts)—to be cited with stable URLs.

### Thesis notes (draft bullets for later prose)

- Information density (tables, SVGs, layout).
- Sharing (links vs attachments).
- Two-way interaction (parameters feeding back into prompts).
- Readability at length (~100+ lines).
- Caveat: HTML **augments** Markdown rather than replacing it; best when outputs are re-read, reviewed, filtered, or follow-up edited (e.g. LLM Wiki, deep research, prototyping).

---

## Inventory: Markdown surfaces in OpenThrottle and Ralph

_(Task: catalog every place Markdown is produced, consumed, or rendered.)_

| Surface | Repo path / mechanism | Readers (human / agent / both) | Notes |
| ------- | --------------------- | ------------------------------ | ----- |
| _(TBD)_ |                       |                                |       |

### Candidate areas (to verify and expand)

- Ralph / agent prompt files (e.g. under `.cursor/commands/agents/`, injected prompts).
- Plan and task `description` / `summary` fields (GraphQL, DB).
- Plan output stream (`plan_output_stream`, `append_plan_output` / `get_plan_output`).
- Cortex / documentation tables and embeddings (`documentation`, `documentation_embeddings`).
- Docs ingestion (`pnpm run database:import-docs` → `scripts/openthrottle-ingest-docs.ts`).
- Developer app rendered plan and task content.
- MCP tool responses (mcp-developer, docs-mcp).
- Commit messages and PR descriptions (e.g. `Plan-Id` / `Task-Id` footers).
- README and package docs ingested into search.

---

## Per-surface evaluation (helps / neutral / hurts)

_(Task: score each inventory row using trq212-style criteria: information density, re-read frequency, team review, filtering, follow-up editing, two-way interaction.)_

| Surface | Verdict (`helps` / `neutral` / `hurts`) | Rationale (one sentence) |
| ------- | --------------------------------------- | ------------------------ |
| _(TBD)_ |                                         |                          |

### Focus areas called out in the plan

- Ralph iteration prompts: token cost vs structure.
- Plan output stream: diffability and incremental append.
- Developer app plan/task views: rich tables and diagrams.
- Docs embeddings: chunking and semantic search quality on HTML.

---

## Prototype and experiment ideas

_(Task: 3–5 small, well-scoped ideas—documented only, not implemented.)_

1. _(TBD)_ — Goal, surface, success criteria, rough effort.
2. _(TBD)_
3. _(TBD)_

---

## Open questions, risks, and constraints

_(Task: embedding pipeline, tokens, git diff, accessibility/sanitization, MCP transport, storage, authoring DX, backward compatibility.)_

- _(TBD)_ — Question — Suggested next step.

---

## Recommendation

_(Task: phased rollout vs explicit “not now,” plus short “next actions” if proceeding.)_

### Phased rollout _(or “not now”)_

_(TBD)_

### Next actions if we proceed

_(TBD: follow-up OT plans/tasks—no implementation in this research plan.)_

---

## Document history

| Date       | Change                                                     |
| ---------- | ---------------------------------------------------------- |
| 2026-05-12 | Skeleton created (`81026da4-a09e-4ab0-8451-6239a7318211`). |
