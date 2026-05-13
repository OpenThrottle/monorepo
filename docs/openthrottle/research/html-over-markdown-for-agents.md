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

Thariq Shihipar ([@trq212](https://x.com/trq212), described in secondary commentary as on the Claude Code team at Anthropic) argued in a May 2026 X thread (“Using Claude Code: The Unreasonable Effectiveness of HTML,” [status `2052809885763747935`](https://x.com/trq212/status/2052809885763747935)) that **asking coding agents for HTML output**—not only Markdown—changes how useful the artifact is after the model stops: you can ship a single file that behaves more like a lightweight workspace (navigation, tables, collapsible sections, severity filters, inline styling) than a linear document. Follow-on synthesis ([Simon Willison, 2026-05-08](https://simonwillison.net/2026/May/8/unreasonable-effectiveness-of-html/)) frames this as a reconsideration of the old GPT‑4-era habit of defaulting to Markdown for token efficiency, now that models and contexts are larger and rich layout can reduce human time-to-understanding on dense outputs. The same thread is summarized in the tech press aggregator [Techmeme (2026-05-11)](https://www.techmeme.com/260511/p31) as: HTML as a better agent output format than Markdown, citing **information density**, **ease of sharing**, and **two-way interaction**. [StableLearn’s write-up](https://stable-learn.com/en/claude-code-html-output/) distills the practical rule echoed across discussions: **use HTML when the output will be re-read, reviewed, compared, filtered, or edited**; **keep Markdown for short, disposable notes** where simplicity wins.

There is **no separate Anthropic engineering blog post** surfaced in this pass as a canonical “first-party” long-form companion to the thread; the traceable primary source remains the **X thread** above, with **Simon Willison** and **StableLearn** linking it explicitly and **Techmeme** indexing the claim. Shihipar also pointed readers to a gallery of example HTML artifacts at [thariqs.github.io/html-effectiveness](https://thariqs.github.io/html-effectiveness/) (linked from Willison’s post).

**Claims most often attributed to the thesis (check original thread for exact wording):**

- **Higher information density** — Tables, SVG/diagrams, CSS layout, and structured components carry relationships that are awkward or verbose in Markdown alone.
- **Sharing and hosting** — A single `.html` can be opened locally, dropped on static hosting, or shared via URL; Markdown often implies another render step or attachment workflow for non-technical readers.
- **Readability past “~100 lines”** — Long Markdown runs collapse into scroll-heavy slabs; HTML can add hierarchy, navigation, and visual grouping so reviewers scan faster.
- **Two-way / continued work** — Interactive controls (sliders, filters, expand/collapse) can capture intent and feed the next prompt or review step; Markdown is mostly read-only text.
- **“LLM Wiki” / operational artifact pattern** — Treat agent output as something you **live in** (triage board, review dashboard, research report with anchors) rather than a one-shot transcript.
- **Explicit caveat (repeated in StableLearn and the plan brief)** — HTML **augments** Markdown; it is **not** a blanket replacement. For quick answers, tiny diffs, or token-sensitive **model inputs**, Markdown (or plain text) often remains the better default.

**Primary and secondary links (stable URLs):**

| Source                     | URL                                                                                                                                                  | Role                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Thariq Shihipar (@trq212)  | [https://x.com/trq212/status/2052809885763747935](https://x.com/trq212/status/2052809885763747935)                                                   | Primary thread                                                       |
| Example gallery            | [https://thariqs.github.io/html-effectiveness/](https://thariqs.github.io/html-effectiveness/)                                                       | Linked from commentary; concrete HTML samples                        |
| Simon Willison (link blog) | [https://simonwillison.net/2026/May/8/unreasonable-effectiveness-of-html/](https://simonwillison.net/2026/May/8/unreasonable-effectiveness-of-html/) | Context + prompt patterns; attributes authorship to Claude Code team |
| Techmeme                   | [https://www.techmeme.com/260511/p31](https://www.techmeme.com/260511/p31)                                                                           | News aggregation blurb                                               |
| StableLearn                | [https://stable-learn.com/en/claude-code-html-output/](https://stable-learn.com/en/claude-code-html-output/)                                         | Longer synthesis + reusable prompt snippets                          |

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

| Date       | Change                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| 2026-05-12 | Skeleton created (`81026da4-a09e-4ab0-8451-6239a7318211`).                                             |
| 2026-05-12 | Background and thesis summary with primary/secondary sources (`72e674ba-84d3-4709-8acc-f122be88555e`). |
