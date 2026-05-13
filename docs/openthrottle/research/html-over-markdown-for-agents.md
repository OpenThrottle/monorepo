# Research: HTML over Markdown for Ralph agent workflow

**Status:** Complete. **Plan:** `78e34f99-35a0-41e3-9c29-fa4c8b4a5ca4`.

This document tracks exploration of using HTML (alongside or instead of Markdown) as a primary surface for agent outputs and human review in the OpenThrottle Ralph stack. **No functional or schema changes** are in scope for this research artifact—only analysis and recommendations.

---

## TL;DR

**Verdict — proceed, but additively and narrowly.** The trq212 / StableLearn thesis maps cleanly onto OpenThrottle in exactly two places: the **developer-app plan/task views** and the **plan output stream rendering** in `PlanLoggerOutput`. Everywhere else in our stack (commit messages, MCP tool payloads, ingest sources, embeddings, the Ralph injected prompt block, stdout parsers) HTML is neutral at best and actively harmful at worst — it inflates tokens, adds XSS surface, breaks line-based diffs, and degrades semantic-search signal. The right move is a **three-phase rollout that keeps every canonical store text/Markdown** and treats HTML as an **optional derived presentation** layered on top, gated by sanitization, a11y, and embedding-pipeline guardrails. See [Phased rollout](#phased-rollout-or-not-now) below; the immediate next action is a follow-up OT plan to spike Prototype #1 (end-of-run HTML dashboard) without changing schema, MCP contracts, or ingest behavior.

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

| Surface                                       | Repo path / mechanism                                                                                                                                                                                                                                                                                      | Readers (human / agent / both)                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activity-by-date payloads                     | `applications/openthrottle-server/src/graphql/activity/activity.resolver.ts` (raw SQL over `plan_output_stream`, `commit_links`, tasks); MCP `get_activity_by_date` in `packages/mcp-developer` / `packages/ai-mcp`                                                                                        | Agent (MCP); humans rarely raw                                   | Returns text snippets from plan output chunks among other sources; format is opaque/plain, often markdown-like in practice.                                                                                                                                                                                                                                                                                       |
| Agent Cursor commands (Markdown files)        | `.cursor/commands/agents/ralph.md`, `.cursor/commands/agents/code-review.md`; `.opencode/agents/*.md`                                                                                                                                                                                                      | Both                                                             | Human-authored procedure text; agents consume when the workflow or user attaches these instructions.                                                                                                                                                                                                                                                                                                              |
| Commit messages and OT footers                | Husky / `agents.mdc` convention: `Plan-Id` / `Task-Id` in commit body; conventional commit title                                                                                                                                                                                                           | Human (review, `git log`); automation (`commit_links`, activity) | Plain text; markdown conventions (bullets, backticks) common but not required.                                                                                                                                                                                                                                                                                                                                    |
| Cortex custom prompts                         | Postgres `custom_prompts` (+ optional `custom_prompt_embeddings` per `databases/README.md`); GraphQL in `openthrottle-server`; UI `applications/openthrottle-developer/app/routes/prompts.*`, `PromptDetailMetadataPanel.tsx`                                                                              | Human (author/edit); agent if injected elsewhere                 | `prompts.create.tsx` uses Monaco `language="markdown"`; content treated as markdown-flavored text, not necessarily rendered as HTML.                                                                                                                                                                                                                                                                              |
| Doc ingestion (batch)                         | `scripts/openthrottle-ingest-docs.ts` → `documentation` + `documentation_embeddings`; `pnpm run database:import-docs`                                                                                                                                                                                      | Automation; humans trigger locally/CI                            | Ingests `docs/**/*.md` and NX project `README.md` paths (`projects/<root>/README.md`); `chunkTextForEmbedding` splits on blank lines then lines (`MAX_EMBEDDING_CHARS`).                                                                                                                                                                                                                                          |
| Doc ingestion (selective job)                 | `applications/openthrottle-server/src/graphql/queues/enqueue-doc-ingestion.input.ts`; `tools/workflows/src/doc-ingestion/doc-ingestion-diff.ts` (`expandToMarkdownPaths`)                                                                                                                                  | Automation (BullMQ)                                              | Input is explicit markdown-relative paths; diff expands to `.md` targets.                                                                                                                                                                                                                                                                                                                                         |
| Documentation MCP                             | `packages/docs-mcp/src/tools/search.ts` (`documentation_semantic_search`, `get_document`)                                                                                                                                                                                                                  | Agent                                                            | Returns chunk `content` as text for the model; no HTML rendering layer in MCP.                                                                                                                                                                                                                                                                                                                                    |
| GitHub PR / issue templates                   | `.github/pull_request_template.md` (and similar)                                                                                                                                                                                                                                                           | Human                                                            | Markdown template for human-written PR bodies.                                                                                                                                                                                                                                                                                                                                                                    |
| Monorepo onboarding / agent config (Markdown) | `AGENTS.md`, `CONTRIBUTING.md`, `databases/README.md`, `docs/**/*.md`                                                                                                                                                                                                                                      | Both                                                             | Humans maintain; agents and embeddings consume `docs/` subset via ingest.                                                                                                                                                                                                                                                                                                                                         |
| NestJS LangChain markdown loaders             | `packages/nestjs-langchain/src/loaders/markdown.ts`, `sandbox.ts`, `utils/files.ts`                                                                                                                                                                                                                        | Agent workflows                                                  | Loads `.md` / `.mdc` from disk into LangChain-style documents for server-side agents—not Ralph CLI per se, but same stack family.                                                                                                                                                                                                                                                                                 |
| Plan and task text fields                     | Postgres `plans` (`description`, `summary`, …), `tasks` (`description`, …); GraphQL + MCP CRUD (`mcp-developer`, `ai-mcp`)                                                                                                                                                                                 | Both                                                             | Unstructured `TEXT`; product and OT rules assume markdown-style authoring for long PRDs. `formatPlanAndTasksForPrompt` flattens task `description` newlines to spaces for the injected block.                                                                                                                                                                                                                     |
| Plan embeddings (semantic search over plans)  | `plan_embeddings` + ingest paths in `databases/README.md`, `scripts/openthrottle-ingest-plans.ts`                                                                                                                                                                                                          | Agent (MCP `semantic_search`); admin scripts                     | Chunks of plan (+ optional `*-output.md`) text for vectors; same embedding pipeline concerns as docs.                                                                                                                                                                                                                                                                                                             |
| Plan output stream                            | `plan_output_stream` table; `append_plan_output` / `get_plan_output` (`packages/mcp-developer/src/tools/output.ts`, `packages/ai-mcp/src/tools/output.ts`); `tools/workflows/src/utils/cortex-ralph.ts` (`INSERT INTO plan_output_stream`); processors in `applications/openthrottle-server/src/queues/**` | Both                                                             | Append-only log of agent/worker stdout-style chunks; often markdown sections and code fences. CLI Ralph logs to terminal unless `streamToCortex` (see workflows README / `child-job`).                                                                                                                                                                                                                            |
| Plans legacy file ingest                      | `scripts/openthrottle-ingest-plans.ts` (optional per-plan `*-output.md` → `plan_output_stream` + embeddings)                                                                                                                                                                                               | Automation                                                       | Bridges historical file-based plan output into Cortex.                                                                                                                                                                                                                                                                                                                                                            |
| Ralph CLI injected prompt block               | `tools/workflows/src/utils/cortex-ralph.ts` (`formatPlanAndTasksForPrompt`); consumed in `tools/workflows/src/bin/ralph.ts` (`basePrompt`); executed via `tools/workflows/src/bin/run-iteration.ts` (`agentPrompt` → `cursor-agent` / `claude`)                                                            | Agent                                                            | Plain-text block labeled “Cortex plan (injected by Ralph from Postgres)”; not Markdown syntax per se but same family as prompt markdown.                                                                                                                                                                                                                                                                          |
| Task embeddings                               | `task_embeddings`; same ingest / MCP semantic search stack as plans                                                                                                                                                                                                                                        | Agent                                                            | Chunked `tasks.description` (and related text) for `semantic_search`.                                                                                                                                                                                                                                                                                                                                             |
| UI – global error boundary                    | `packages/react-router-ui-global/src/components/GlobalErrorBoundary.tsx`                                                                                                                                                                                                                                   | Human                                                            | Uses shared `Markdown` component for error detail / stack text.                                                                                                                                                                                                                                                                                                                                                   |
| UI – notes                                    | `applications/openthrottle-developer/app/routing/notes/components/NoteCard.tsx`                                                                                                                                                                                                                            | Human                                                            | Passes `note.content` into `Markdown`.                                                                                                                                                                                                                                                                                                                                                                            |
| UI – plan logger (output stream)              | `applications/openthrottle-developer/app/routing/plans/components/PlanLoggerOutput.tsx`                                                                                                                                                                                                                    | Human                                                            | Concatenates chunks into a synthetic markdown string (`###` headers, `---` separators) then `<Markdown …>`.                                                                                                                                                                                                                                                                                                       |
| UI – plan overview / details                  | `applications/openthrottle-developer/app/routing/plans/components/PlanTabDetails.tsx`, `PlanDetails.tsx`                                                                                                                                                                                                   | Human                                                            | `EditorWindow` uses `language="markdown"` in fullscreen; non-fullscreen uses `<Markdown content={plan.description}>`. **Implementation note:** `packages/react-router-shadcn/src/components/Markdown.tsx` currently renders string content inside `<pre><code>` (no markdown parser); duplicate raw `<p>` exists alongside in `PlanTabDetails`—so “markdown” here is partly intent/naming, not full MD rendering. |
| UI – tasks                                    | `applications/openthrottle-developer/app/routing/plans/components/TaskDetails.tsx`                                                                                                                                                                                                                         | Human                                                            | Markdown rendering for task body is commented out; plain text path today.                                                                                                                                                                                                                                                                                                                                         |
| mcp-developer tool text results               | `packages/mcp-developer` resolvers (e.g. `get_document`, `semantic_search`, plan/task getters returning `description`)                                                                                                                                                                                     | Agent                                                            | JSON/text over MCP; clients render as plain text or their own markdown UI.                                                                                                                                                                                                                                                                                                                                        |
| Workflow parser fixtures                      | `tools/workflows/src/utils/__tests__/parsers.test.ts` (markdown code fences in synthetic agent output)                                                                                                                                                                                                     | Tests only                                                       | Illustrates expected `<ralph:task-complete>` parsing around markdown-heavy stdout.                                                                                                                                                                                                                                                                                                                                |

**Out of scope / weakly related:** ad-hoc `console.log` debug blobs during ingest (e.g. NX graph dump) are developer noise, not a durable markdown product surface. GraphQL `__generated__` comments that say “markdown paths” are schema hints for humans, not runtime markdown.

---

## Per-surface evaluation (helps / neutral / hurts)

Scores use the trq212 / StableLearn lens: **helps** where outputs are re-read, reviewed, filtered, or edited and layout or interaction buys human time; **hurts** where token budget, parseability, diff hygiene, or embedding signal dominates; **neutral** when HTML neither clearly wins nor clearly loses without extra layers (e.g. transport-only text).

| Surface                                       | Verdict   | Rationale (one sentence)                                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activity-by-date payloads                     | `neutral` | MCP returns opaque text snippets for agents; wrapping them in HTML adds no structured affordance unless the client adds a renderer, while tags could dilute skim value in plain-text clients.                                                                                                              |
| Agent Cursor commands (Markdown files)        | `neutral` | IDE-friendly Markdown remains the default for authoring and diff; HTML source in `.md` command files would hurt authoring and reviews without a strong preview pipeline.                                                                                                                                   |
| Commit messages and OT footers                | `hurts`   | Conventional-commit and `git log` tooling assume compact plain text; HTML bloats messages and fights parsers, hooks, and mail clients.                                                                                                                                                                     |
| Cortex custom prompts                         | `neutral` | Monaco `language="markdown"` fits human editing; if the same blob is injected wholesale into agents, heavy HTML tends toward **hurts** on tokens—treat rich formatting as optional, not the default transport.                                                                                             |
| Doc ingestion (batch)                         | `hurts`   | Raw HTML in `documentation` chunks increases tokenizer noise, complicates `chunkTextForEmbedding`, and can weaken semantic retrieval unless normalized or stripped—**helps** only after a deliberate text/HTML policy and pipeline change.                                                                 |
| Doc ingestion (selective job)                 | `hurts`   | Same as batch: path contract is Markdown-centric today; HTML-first sources need explicit extraction rules before embeddings.                                                                                                                                                                               |
| Documentation MCP                             | `neutral` | Agents consume string chunks regardless of minor markup; shipping HTML through MCP is fine only if consumers strip or sandbox it—default remains “text for the model,” not a second render tier.                                                                                                           |
| GitHub PR / issue templates                   | `neutral` | Authors write Markdown; GitHub already renders to HTML for humans—switching templates to hand-authored HTML rarely pays off versus staying in Markdown.                                                                                                                                                    |
| Monorepo onboarding / agent config (Markdown) | `neutral` | `AGENTS.md` / `docs/**/*.md` stay legible in repo and in Cursor; moving primary authoring to HTML would trade editor ergonomics for layout wins that matter more on published sites than in-tree.                                                                                                          |
| NestJS LangChain markdown loaders             | `neutral` | Loader and file extension contract are `.md`-oriented; HTML files would need parallel loaders—no inherent win until product asks for HTML artifacts on disk.                                                                                                                                               |
| Plan and task text fields                     | `neutral` | **Humans** reviewing long PRDs in the app fit the “HTML helps” story if rendered safely; **agents and embeddings** see the same `TEXT` and are hurt by unsanitized tag soup—verdict is split, so **neutral** until a dual representation (canonical text + rendered view) exists.                          |
| Plan embeddings (semantic search)             | `hurts`   | Embedding models see surface tokens; unnormalized HTML increases noise-to-signal versus prose Markdown unless content is normalized to text before chunking.                                                                                                                                               |
| Plan output stream                            | `hurts`   | Append-only stdout-style logs, `<ralph:*>` markers, and code fences assume linear text and stable parsing; HTML as the **primary** chunk format worsens diffability and incremental tooling—**helps** only as an optional **derived** artifact (e.g. end-of-run dashboard file), not as the stream itself. |
| Plans legacy file ingest (`*-output.md`)      | `neutral` | Same dual nature as the stream: Markdown files ingest cleanly; HTML “logs” would need the same embedding and safety analysis as doc HTML.                                                                                                                                                                  |
| Ralph CLI injected prompt block               | `hurts`   | Injected Cortex blocks should stay dense plain text: HTML tags and attributes burn context without improving model reasoning for task completion markers.                                                                                                                                                  |
| Task embeddings                               | `hurts`   | Same embedding-signal issue as plan embeddings when descriptions contain markup-heavy HTML.                                                                                                                                                                                                                |
| UI – global error boundary                    | `neutral` | Errors are short-lived and technical; Markdown/plain is enough unless we invest in rich incident layouts (low ROI).                                                                                                                                                                                        |
| UI – notes                                    | `neutral` | Short user notes rarely need layout complexity; Markdown (or plain) stays simplest.                                                                                                                                                                                                                        |
| UI – plan logger (output stream)              | `helps`   | This is the strongest in-app match for trq212: long, re-read iteration logs benefit from hierarchy, collapsible sections, tables, and filters—today’s synthetic Markdown string is a stepping stone, not the ceiling.                                                                                      |
| UI – plan overview / details                  | `helps`   | Long `plan.description` and PRD-style content are re-read and team-reviewed; safe HTML rendering (or MD with a richer component set) improves scanability versus a single scrolling slab—subject to sanitization and fixing the current Markdown/presentation quirks noted in the inventory.               |
| UI – tasks                                    | `neutral` | Task body is plain text today; if descriptions grow into mini-specs, **helps** could apply later—no win until content and renderer exist.                                                                                                                                                                  |
| mcp-developer tool text results               | `hurts`   | JSON/text over MCP is consumed by agents and thin clients; HTML payloads increase tokens and XSS surface without a universal renderer contract.                                                                                                                                                            |
| Workflow parser fixtures                      | `hurts`   | Tests and `ralph` stdout parsers assume markdown code fences and stable delimiters; HTML-wrapped outputs would break or complicate extraction unless parsers are redesigned.                                                                                                                               |

### Focus areas called out in the plan

**Ralph iteration prompts (token cost vs structure)** — **Verdict: favor plain text / light Markdown.** The injected block in `cortex-ralph.ts` / `ralph.ts` is model **input**; trq212 and StableLearn explicitly carve out short, disposable, token-sensitive cases for non-HTML. Structure should come from labeled sections and bullet lists, not `<div>` trees.

**Plan output stream (diffability and incremental append)** — **Verdict: keep stream text-first; treat HTML as an optional derivative.** Append-only chunks power `get_plan_output`, activity queries, and Ralph’s own markers; HTML in every chunk would harm `git`-style mental diffs, grep, and fence-based tooling. A separate “run report.html” generated once per iteration or at plan completion matches the **helps** pattern without polluting the canonical stream.

**Developer-app plan/task views (rich tables and diagrams)** — **Verdict: strongest `helps` zone in the product.** These views are human-facing, re-read, and often long; tables, callouts, diagrams (SVG), and responsive layout address real pain—provided output is **sanitized** (agent-generated) and accessibility (headings, landmarks, keyboard) is not an afterthought.

**Docs embeddings (chunking and semantic search on HTML)** — **Verdict: `hurts` until the pipeline changes.** `chunkTextForEmbedding` and vector tables assume prose-like text; raw HTML increases boilerplate tokens per chunk and can split tags awkwardly across chunk boundaries. Any move to HTML sources should include **normalization** (e.g. readability-style extraction or HTML-to-text) before embedding, with spot-checked retrieval quality.

---

## Prototype and experiment ideas

Small, well-scoped experiments the team could run **later**—each is **documentation-only here**; no implementation is part of this research plan.

### 1. End-of-run HTML “plan dashboard” artifact

| Field                | Detail                                                                                                                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | Validate whether a **single self-contained HTML file** (navigation, severity colors, collapsible sections, links back to task UUIDs) reduces human time-to-triage versus scrolling the raw plan output stream.                                                                                |
| **Surface**          | Ralph / worker writes an optional artifact (e.g. `ralph-run-<iteration>.html`) to a known path or attaches metadata pointing to hosted static HTML; **canonical** stream remains plain/Markdown text in `plan_output_stream`.                                                                 |
| **Success criteria** | (a) Two engineers independently rank comprehension faster/same/slower vs current `PlanLoggerOutput` for the same run; (b) artifact generation does not regress `<ralph:task-complete>` parsing or append-only ingest; (c) file size and PII policy acceptable (no secrets in inline scripts). |
| **Rough effort**     | **S** — One-off script or gated flag in `workflow-ralph` path that concatenates chunks + wraps in a static template; no DB schema change if written to CI artifact storage only.                                                                                                              |

### 2. HTML wrapper / “reader mode” for plan output in developer-app

| Field                | Detail                                                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | Test whether **sanitized HTML rendering** of the same logical content (tables for task list, anchors per chunk) improves scanability without changing what gets stored in Cortex.                                                                             |
| **Surface**          | `PlanLoggerOutput.tsx` (and optionally `PlanTabDetails` for long descriptions): keep storing Markdown/plain in Postgres; **client-side** convert or alternate view (toggle: “Markdown” / “Rich”) with strict allowlist (e.g. DOMPurify profile, no `script`). |
| **Success criteria** | (a) No XSS in red-team fixtures of malicious `append_plan_output` content; (b) Lighthouse accessibility score non-regressive on plan detail route; (c) qualitative feedback from 3 internal users on a real long-running plan.                                |
| **Rough effort**     | **M** — UI toggle, sanitizer dependency, test matrix for edge cases; possible tension with current `Markdown` + `<pre>` behavior documented in the inventory.                                                                                                 |

### 3. HTML-rendered task table for review (read-only)

| Field                | Detail                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Goal**             | See if a **tabular HTML export** of `get_remaining_tasks_for_plan` / task statuses helps standups and cross-team review vs a bullet list in Markdown.                                      |
| **Surface**          | Export from developer-app or a small server route that renders HTML from GraphQL (no new MCP contract); optional “Copy as HTML” for pasting into email/wiki.                               |
| **Success criteria** | (a) Reviewers complete a “mark blocked tasks” exercise faster with the table vs Markdown list (timed); (b) export remains read-only—no interactive params feeding back into prompts in v1. |
| **Rough effort**     | **S** — Template + one route or CLI subcommand; no embedding pipeline touch.                                                                                                               |

### 4. Interactive HTML “LLM Wiki” slice over docs or plan knowledge

| Field                | Detail                                                                                                                                                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**             | Prototype the **“live in the artifact”** pattern: filters (tag, path prefix), expand/collapse, and client-side search over a **static bundle** generated from a subset of `documentation` chunks or one plan’s output—mirroring trq212’s gallery idea at a tiny scope. |
| **Surface**          | Offline-generated `index.html` + JSON data file from `database:import-docs` output or a one-plan export; not wired into `docs-mcp` responses initially.                                                                                                                |
| **Success criteria** | (a) A non-engineer finds three answers in seeded wiki faster than with `documentation_semantic_search` alone (task-based usability); (b) bundle size & offline use documented; (c) explicit decision on whether MCP ever returns HTML (default stays text).            |
| **Rough effort**     | **L** — Data shape, build step, and UX for filters; overlaps with embedding/search policy if promoted beyond static demo.                                                                                                                                              |

### 5. Richer change summary in PR bodies (Markdown-first, HTML optional)

| Field                | Detail                                                                                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Goal**             | Assess whether **embedding a small HTML table or diagram** (e.g. Mermaid rendered to SVG screenshot, or paste from static host) in GitHub PR descriptions improves reviewer understanding vs Markdown-only bullets—without violating repo PR template norms. |
| **Surface**          | `.github/pull_request_template.md` remains Markdown; experiment is **opt-in** on selected PRs (human pastes link or `<img>` if GitHub allows).                                                                                                               |
| **Success criteria** | (a) Track reviewer comments asking for clarification—count decreases on pilot PRs; (b) no breakage of `gh pr create` automation or commitlint; (c) document “when HTML in PR body helps vs hurts mobile readers.”                                            |
| **Rough effort**     | **S** — Process/culture experiment with 2–3 PRs; zero code if links only; **M** if automation generates HTML summaries (touches CI/token cost).                                                                                                              |

### Summary

| #   | Idea                                | Effort | Highest risk        |
| --- | ----------------------------------- | ------ | ------------------- |
| 1   | End-of-run HTML dashboard file      | S      | Storage / PII       |
| 2   | Sanitized rich view for plan logger | M      | XSS + a11y          |
| 3   | Task table HTML export              | S      | Low                 |
| 4   | Static LLM Wiki slice               | L      | Scope creep vs MCP  |
| 5   | PR description richness             | S–M    | Automation + mobile |

---

## Open questions, risks, and constraints

Before any rollout that treats HTML as a first-class artifact (in streams, MCP payloads, or ingest sources), the following risks and unknowns should be resolved. Each item states an **open question** and a **recommended next step** (still research or spike—no commitment to build).

### (a) Embedding pipeline behavior on HTML

**Question:** If `documentation` / `plan_embeddings` / `task_embeddings` receive raw HTML (or Markdown with heavy inline HTML), how do `chunkTextForEmbedding` boundaries, tokenizer behavior, and vector similarity change versus prose? Do we strip tags to text first, embed HTML-as-text, or maintain dual columns (raw + `content_text`)?

**Risks:** Tag boilerplate dominates chunk budget; chunks split mid-tag produce invalid fragments and odd nearest-neighbor matches; semantic search quality may drop for natural-language queries unless normalization is consistent.

**Recommended next step:** Run a **controlled ingest spike** on a small corpus: (1) baseline Markdown chunks, (2) same content as minimal HTML, (3) HTML with layout noise (nested `div`s, inline styles). Measure chunk counts, mean chunk length, and top-k retrieval precision on a fixed query set. Document a default policy (e.g. “strip to text before embed” vs “embed as-is”) before changing `openthrottle-ingest-docs` or plan ingest.

### (b) Token cost versus Markdown for agent prompts

**Question:** For equal _human_ information (e.g. a table of ten tasks), what is the token delta between a compact Markdown table, a verbose HTML table, and HTML with CSS classes—especially when the same block is injected every Ralph iteration?

**Risks:** Repeated HTML headers and wrappers multiply context use; models may attend to presentation tokens instead of semantics unless prompts are curated.

**Recommended next step:** Instrument or manually count tokens (same content, three formats) for a **representative Cortex injection** (`formatPlanAndTasksForPrompt` + typical `description` length). Set a **budget guideline** (e.g. “no raw HTML in injected block unless under N tokens”) for any future template change.

### (c) Diff and review friction in Git

**Question:** When HTML artifacts or HTML-heavy files are committed (or when plan output is mirrored to files), do `git diff`, GitHub’s UI, and team review habits degrade versus Markdown line-based diffs?

**Risks:** Minified or long single-line HTML is effectively unreviewable; attribute reordering creates noisy diffs; blame/history becomes harder to read for non-frontend reviewers.

**Recommended next step:** If prototype (1) or (5) produces committed HTML, trial **formatting policy** (pretty-printed HTML, max line length) and compare reviewer time on a paired PR. Prefer **generated artifacts** in `dist/` or CI-only storage if diffs in main are unacceptable.

### (d) Accessibility and sanitization (XSS, untrusted agent output)

**Question:** Any path that renders `plan_output_stream`, task bodies, or MCP-sourced strings as HTML in the browser needs a **threat model**: who can append content, and what tags/events are allowed? How do we meet WCAG-style expectations (headings, focus order, `alt` text) for generated dashboards?

**Risks:** `append_plan_output` and agent stdout are **untrusted**; naive `dangerouslySetInnerHTML` or loose sanitizer profiles enable stored XSS for anyone with write access to plans. Rich layout can also harm screen-reader users if everything is `div`-soup.

**Recommended next step:** Define a **DOMPurify (or equivalent) allowlist** and CSP notes for any rich view spike; add **red-team fixtures** to UI tests (script, `onerror`, `javascript:` URLs). Pair with a11y spot-check (axe or Lighthouse) on `PlanLoggerOutput` / plan detail routes before widening HTML rendering.

### (e) MCP transport and client rendering

**Question:** Should `mcp-developer` or `docs-mcp` ever return **HTML strings** in tool results, or must MCP remain **plain text / JSON** with HTML only in apps or static files? Do Cursor and other MCP clients strip tags, double-encode, or pass through to a markdown renderer that breaks on tags?

**Risks:** Agents consume **more tokens** for the same facts; inconsistent client behavior; debugging becomes “why did the model see angle brackets?”

**Recommended next step:** **Default: keep MCP responses text-first.** If an experiment needs HTML, use an **opaque URL** or file path in the tool result and document the contract. Spike: send a short HTML snippet through `get_document` in a dev MCP client and record behavior (length, escaping, rendering).

### (f) Storage and serving (S3-like hosting, artifact lifecycle)

**Question:** For end-of-run dashboards or large static wikis, is **Postgres `TEXT` / `plan_output_stream`** sufficient, or do we need object storage (GCS/S3), signed URLs, retention policy, and virus/static-analysis scanning?

**Risks:** DB bloat and backup cost; PII or secrets pasted into HTML artifacts; no CDN = slow loads for large self-contained files.

**Recommended next step:** For prototype (1), decide **one** storage class (e.g. CI artifact only vs new bucket vs DB blob column) and document **retention + PII**. Do not mix secrets into HTML without the same handling as logs.

### (g) Authoring experience inside Cursor and for agents

**Question:** Will humans author Cortex `description` / custom prompts primarily in Markdown with occasional HTML, or will we introduce WYSIWYG / split preview? How do agents **author** valid HTML without breaking fences and `<ralph:*>` markers?

**Risks:** Monaco `language="markdown"` does not validate HTML; mixed MD+HTML confuses writers; agents may emit broken partial tags that break downstream parsers.

**Recommended next step:** **Authoring guideline** doc: “HTML allowed only in these fields / these prototypes.” Optionally add lint or server-side validation (balance tags, deny `script`) before persist—scoped to a follow-up plan, not this research file’s implementation.

### (h) Backward compatibility with existing Markdown surfaces

**Question:** How do we avoid breaking **Ralph stdout parsers**, **ingest path assumptions** (`docs/**/*.md`, `expandToMarkdownPaths`), **GraphQL clients** that expect `description` as Markdown-ish text, and **embeddings** already trained on historical chunks?

**Risks:** Silent behavior change if one surface flips to HTML-first; dual formats without a version flag confuse `semantic_search` consumers.

**Recommended next step:** Maintain a **compatibility matrix** (surface × canonical format × optional HTML derivative) for one release cycle. Any new HTML capability should be **additive** (new column, new artifact type, or client-only view) until ingest and MCP contracts are explicitly versioned or migrated.

---

## Recommendation

**Proceed with a phased, additive rollout.** The per-surface evaluation found exactly **two `helps` surfaces** (`PlanLoggerOutput` and plan/task detail views in the developer-app), a **majority `neutral`** middle, and a long tail of **`hurts`** surfaces (embeddings, agent prompt input, stdout parsers, commit messages, MCP payloads). That distribution rules out an HTML-first migration and rules in **HTML as a layered, opt-in artifact** on top of canonical text/Markdown stores. Every phase below is **non-breaking by construction**: no schema changes, no MCP contract changes, no ingest path changes are required to start, and each phase has explicit exit criteria before the next one unlocks.

### Phased rollout _(or "not now")_

#### Phase 1 — Additive, low-risk artifacts (start here)

**Goal:** Validate the trq212 "live in the artifact" payoff on the **easiest** surfaces, with **zero** changes to canonical storage or agent contracts.

- **Scope:** Prototype #1 (end-of-run HTML dashboard file) and Prototype #3 (read-only task-table HTML export). Both write **derived** HTML; the source of truth stays in `plan_output_stream` / `tasks` as text.
- **Out of scope:** Touching `chunkTextForEmbedding`, `documentation` ingest, MCP tool result formats, the Ralph injected prompt block, or any commit/PR template change.
- **Success metrics:**
  - At least **one engineer pair** reports faster comprehension on a real long Ralph run vs the current `PlanLoggerOutput` view (qualitative, paired comparison).
  - **Zero regressions** to `<ralph:task-complete>` parsing, append-only ingest, or `get_activity_by_date` shape (covered by existing tests in `tools/workflows/src/utils/__tests__/parsers.test.ts`).
  - Storage and PII policy explicitly chosen (CI artifact vs object storage vs DB column) and documented before any artifact lands in shared storage.
- **Exit criteria to unlock Phase 2:** Both prototypes shipped behind a flag, success metrics met, and **no XSS findings** on red-team fixtures of malicious `append_plan_output` content (even though Phase 1 does not render in-app, this validates content hygiene before Phase 2 does).

#### Phase 2 — Sanitized in-app rendering

**Goal:** Bring the **`helps` verdicts** from the per-surface evaluation into the developer-app — `PlanLoggerOutput` and plan/task detail views — behind a strict sanitizer and a11y baseline.

- **Scope:** Prototype #2 (sanitized rich view for plan logger). Reuses Phase 1's red-team fixtures. Resolves the inventory note about `packages/react-router-shadcn/src/components/Markdown.tsx` rendering content inside `<pre><code>` (no real Markdown parser today) and the duplicate raw `<p>` in `PlanTabDetails`.
- **Hard gates:** DOMPurify (or equivalent) allowlist defined and reviewed; CSP notes added; Lighthouse a11y score non-regressive on plan detail and plan logger routes; explicit deny list for `<script>`, `on*` attributes, and `javascript:` URLs from any agent-authored content.
- **Out of scope:** Changing what `append_plan_output` stores, changing MCP responses, or rendering HTML in the CLI / stdout path (still text-first per the evaluation's `hurts` verdict on the stream itself).
- **Success metrics:**
  - **Three internal users** report qualitative scanability improvement on a real long-running plan.
  - Red-team fixtures pass; axe / Lighthouse a11y score non-regressive vs pre-Phase-2 baseline.
  - "Markdown / Rich" toggle is **off by default** for at least one release cycle so we can revert without a migration.
- **Exit criteria to unlock Phase 3:** Sanitizer + a11y gates green for one full release cycle; documented incident playbook for stored XSS in `plan_output_stream` content.

#### Phase 3 — Higher-risk experiments (LLM Wiki, PR enrichment, agent prompt structure)

**Goal:** Explore the harder bets where wins are real but risks (token cost, embedding signal, ingest contract, mobile review) need the open-questions spikes resolved first.

- **Scope:** Prototype #4 (static "LLM Wiki" slice over docs or one plan), Prototype #5 (richer PR change summaries, Markdown-first with optional HTML), and a small agent-prompt structure spike — **only** after the open-questions work in (a) embedding pipeline, (b) token cost, and (e) MCP transport has produced a written policy.
- **Hard preconditions:**
  - **Open question (a) resolved:** controlled ingest spike comparing Markdown / minimal HTML / noisy HTML chunks landed, with a documented "strip to text before embed" or equivalent default.
  - **Open question (b) resolved:** token-budget guideline written for any HTML in injected Cortex blocks.
  - **Open question (e) resolved:** MCP responses remain **text-first** as default; any HTML escape hatch travels as opaque URLs / file paths, not inline tags.
  - **Open question (h) resolved:** compatibility matrix (surface × canonical format × optional HTML derivative) committed alongside the change.
- **Out of scope (still):** flipping `append_plan_output` to HTML chunks, embedding raw HTML in `documentation` / `plan_embeddings` / `task_embeddings` without normalization, inserting HTML into commit messages, or making any MCP tool result HTML-only.
- **Off-ramp:** If any precondition spike returns a negative result (e.g. retrieval precision drops on HTML chunks, or token cost on injected blocks crosses the budget), Phase 3 collapses to "**not now**" without disturbing Phase 1 or 2 deliverables.

#### Where we explicitly **do not** go (any phase)

These follow directly from the per-surface evaluation and risk analysis; they are called out so future plans do not relitigate them without new evidence:

- **Ralph CLI injected prompt block** — stays plain text / light Markdown (`hurts` verdict; trq212 carve-out for token-sensitive **inputs**).
- **Commit messages and OT footers** — stay plain text with conventional commits and `Plan-Id` / `Task-Id` footers (`hurts` verdict; tooling assumption).
- **`plan_output_stream` chunk format** — stays append-only text/Markdown; HTML lives only in **derived** artifacts and **client-side** rendering (`hurts` verdict on stream-as-HTML).
- **Embeddings (`documentation` / `plan_embeddings` / `task_embeddings`)** — no raw HTML into chunkers without a normalization step (`hurts` verdict; open question (a)).
- **MCP tool result payloads** — stay text/JSON; HTML travels as URLs / file paths if at all (`hurts` verdict; open question (e)).

### Next actions if we proceed

Each item is a **follow-up OT plan or task** to file separately — **no implementation occurs in this research plan**. Phase numbers map to the rollout above.

#### Phase 1 follow-ups

- **Plan: "HTML run-dashboard artifact for Ralph (Prototype #1)"** — gated `workflow-ralph` flag that writes `ralph-run-<iteration>.html` to a chosen storage class (CI artifact / GCS / DB blob); explicit storage + PII decision in the plan description; success metric is paired comprehension comparison.
- **Plan: "Read-only task-table HTML export (Prototype #3)"** — small server route or CLI subcommand that renders `get_remaining_tasks_for_plan` as an HTML table; opt-in "Copy as HTML" affordance; no MCP contract change.
- **Task (added to either plan above): "Red-team fixtures for malicious `append_plan_output` content"** — content hygiene fixtures reused by Phase 2.

#### Phase 2 follow-ups

- **Plan: "Sanitized rich view for `PlanLoggerOutput` (Prototype #2)"** — DOMPurify (or equivalent) allowlist, CSP notes, "Markdown / Rich" toggle off by default; resolves the `Markdown` component / `<pre><code>` inventory note in `packages/react-router-shadcn`.
- **Plan: "A11y baseline for plan detail and plan logger routes"** — axe / Lighthouse sweep before and after Phase 2 lands; required exit gate.
- **Task: "Fix duplicate raw `<p>` alongside `<Markdown>` in `PlanTabDetails`"** — pre-req cleanup so Phase 2 does not inherit ambiguous rendering paths.

#### Phase 3 preconditions (research / spike plans, not feature plans)

- **Plan: "Embedding-pipeline spike for HTML chunks (open question a)"** — controlled comparison of Markdown vs minimal HTML vs noisy HTML on a fixed query set; output is a written ingest policy.
- **Plan: "Token-cost guideline for Cortex injected blocks (open question b)"** — manual / instrumented count for `formatPlanAndTasksForPrompt` with realistic descriptions; output is a budget rule.
- **Plan: "MCP HTML transport policy (open question e)"** — short spike sending HTML through `get_document` in a dev MCP client; output is the "URL / file path, not inline tags" contract written into the MCP package READMEs.
- **Plan: "Compatibility matrix for HTML-derivative surfaces (open question h)"** — one-page surface × canonical-format × optional-HTML-derivative table maintained in this research doc or an adjacent doc; required input to any Phase 3 implementation plan.

#### Cross-cutting

- **Update `AGENTS.md` / `.cursor/rules/`** with an "HTML allowed only in these fields / these prototypes" guideline once Phase 1 lands (open question g).
- **Document any new artifact retention + PII policy** in `databases/README.md` or `docs/openthrottle/` alongside the storage decision (open question f).

---

## Document history

| Date       | Change                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-12 | Skeleton created (`81026da4-a09e-4ab0-8451-6239a7318211`).                                                                         |
| 2026-05-12 | Background and thesis summary with primary/secondary sources (`72e674ba-84d3-4709-8acc-f122be88555e`).                             |
| 2026-05-12 | Completed Markdown / markdown-adjacent inventory table (`9efae634-6c84-480e-834c-a0e12697f0b6`).                                   |
| 2026-05-12 | Added five prototype/experiment sketches with goals, surfaces, success criteria, effort (`71b83d0a-75ea-4f7b-aaea-c36bb03d36d4`).  |
| 2026-05-12 | Documented open questions, risks, constraints (a–h) with recommended next steps (`5093bf77-aa26-4058-888c-7bdaa8e89029`).          |
| 2026-05-12 | Wrote TL;DR verdict, three-phase rollout, "do not go" list, and follow-up plan/task list (`391f1d08-331e-4036-b5f0-73167cdde50b`). |
