# OpenThrottle documentation

Start here to navigate the docs. New to the repo? Follow **Getting started** top to
bottom, then dip into **Usage & reference** as needed.

## Getting started

Three docs, in this order — each has one job, and they do not repeat each other.

1. **[local-quickstart.md](./openthrottle/local-quickstart.md)** — the fresh-clone path: env → migrate → bootstrap tokens → server → verified MCP. Do this once per machine.
2. **[first-time-onboarding.md](./openthrottle/first-time-onboarding.md)** — the mental model plus a copy-paste prompt sequence for your first end-to-end workflow.
3. **[run-openthrottle-server-developer.md](./openthrottle/run-openthrottle-server-developer.md)** — the daily native run loop: ports, env files, Nx targets, native vs Compose.

Along the way:

- [mcp-registration.md](./openthrottle/mcp-registration.md) — register `openthrottle-mcp` in Cursor / Claude Code / other MCP hosts.
- [authoring-plans-via-mcp.md](./openthrottle/authoring-plans-via-mcp.md) — create and manage plans/tasks from your editor via MCP.
- [monorepo/Ollama.md](./monorepo/Ollama.md) — embeddings for `semantic_search`, on Ollama (no cloud API) or OpenAI.

## What OpenThrottle is

- [features.md](./openthrottle/features.md) — product overview: plans, tasks, semantic search, agentic execution (Ralph), dashboard.
- [monorepo-architecture.md](./openthrottle/monorepo-architecture.md) — how the apps and packages fit together (diagrams).
- [../databases/README.md](../databases/README.md) — Postgres schema, migrations, embeddings, imports.

## Usage & reference

- **Local services:** [monorepo/local-services-and-ports.md](./monorepo/local-services-and-ports.md), [Docker_Compose.md](./Docker_Compose.md)
- **Worktrees:** [monorepo/worktree-port-allocation.md](./monorepo/worktree-port-allocation.md)
- **Nx:** [monorepo/NX.md](./monorepo/NX.md), [monorepo/nx-graph.md](./monorepo/nx-graph.md), [monorepo/NX/tags.md](./monorepo/NX/tags.md)
- **Generators:** [tools/templates/](./tools/templates/AGENT_USAGE.md) — scaffold routes, components, packages, services.
- **Skills:** [Skills.md](./Skills.md) — the agent-skills policy and `ot-skill-sync`.
- **Embeddings / Ollama:** [monorepo/Ollama.md](./monorepo/Ollama.md)
- **Scheduled agent jobs:** [openthrottle/scheduled-agent-jobs-usage.md](./openthrottle/scheduled-agent-jobs-usage.md)
- **Agentic CLI chat backends:** [openthrottle/agentic-cli-chat-backends.md](./openthrottle/agentic-cli-chat-backends.md), [openthrottle/agentic-cli-backend-compatibility-guide.md](./openthrottle/agentic-cli-backend-compatibility-guide.md)
- **Server auth:** [openthrottle/openthrottle-server-auth.md](./openthrottle/openthrottle-server-auth.md), [nestjs/wiring-auth-rbac.md](./nestjs/wiring-auth-rbac.md)
- **Plan-run worktrees:** [openthrottle/plan-run-worktrees.md](./openthrottle/plan-run-worktrees.md) — the git worktree OpenThrottle creates for every programmatic plan run, and how the run binds to it.
- **Recurring agent jobs:** [monorepo/recurring-agent-jobs.md](./monorepo/recurring-agent-jobs.md) — the ten read-only `Job_*` audit prompts in `.agents/prompts/` and the two ways to invoke them.
- **Driver stream contracts:** [openthrottle/antigravity-stream-json-schema.md](./openthrottle/antigravity-stream-json-schema.md), [openthrottle/gemini-stream-json-schema.md](./openthrottle/gemini-stream-json-schema.md) — the headless stream-JSON each CLI emits, as probed.
- **Workspace folder picker:** [openthrottle/workspace-native-folder-picker.md](./openthrottle/workspace-native-folder-picker.md) — when the server may open a native OS folder dialog, and the per-OS commands behind it.
- **Developer Vite devtools:** [monorepo/openthrottle-developer-vite-devtools.md](./monorepo/openthrottle-developer-vite-devtools.md) — the diagnostics, bundle analyzer, and host/port levers in the developer app's Vite config.
- **Repo tooling:** [monorepo/Tooling.md](./monorepo/Tooling.md) — SWC TypeScript execution, Python apps, and gcloud CLI auth.

## Contributor reference

- **Docs contract:** [../CONTRIBUTING.md#documentation](../CONTRIBUTING.md#documentation) — what a doc in `docs/` is for, and the `audit:docs-index` reachability gate.
- **Folders & conventions:** [Folders.md](./Folders.md), [openthrottle/packages-naming.md](./openthrottle/packages-naming.md)
- **CI quality gates:** [monorepo/CI-quality-gates.md](./monorepo/CI-quality-gates.md)
- **Dead-code (Knip):** [monorepo/Knip.md](./monorepo/Knip.md)
- **Component shape:** [monorepo/component-primitive-shape.md](./monorepo/component-primitive-shape.md)
- **Route shape:** [monorepo/route-primitive-shape.md](./monorepo/route-primitive-shape.md) — the enforceable standard every `app/routes/*.tsx` module follows.
- **Test coverage:** [monorepo/test-coverage-audit.md](./monorepo/test-coverage-audit.md) — which source files must ship a co-located spec, and what "tested" means.
- **Forms:** [monorepo/Forms.md](./monorepo/Forms.md) — the Formik + Yup + loader/action pattern every React Router form follows.
- **Vitest pool (developer app):** [reliability/developer-vitest-pool.md](./reliability/developer-vitest-pool.md) — why the heaviest jsdom suite in CI is bounded the way it is.
- **GraphQL-only transport:** [workflows/graphql-only-transport-boundary.md](./workflows/graphql-only-transport-boundary.md) — every workflow request goes through GraphQL, with one documented health-check exception.
- **URL-first UI state:** [monorepo/url-first-ui-state.md](./monorepo/url-first-ui-state.md), [monorepo/url-first-react-router-shadcn-learnings.md](./monorepo/url-first-react-router-shadcn-learnings.md)
- **Testing:** [testing/snapshot-replacement-patterns.md](./testing/snapshot-replacement-patterns.md)
- **PWA:** [monorepo/PWA.md](./monorepo/PWA.md) — the manifest + service-worker wiring every React Router app ships.
- **Marketing / video:** [marketing/README.md](./marketing/README.md) — the @OpenThrottleAI "0–60" format and the screencast production pipeline.
- **UI tokens:** [openthrottle/brand-palette.md](./openthrottle/brand-palette.md), [openthrottle/styles.md](./openthrottle/styles.md)

## Agents in other repositories

How OpenThrottle reaches a repository that is not this monorepo — the two halves reach opposite conclusions, so read them together.

- [monorepo/foreign-workspace-skill-injection.md](./monorepo/foreign-workspace-skill-injection.md) — skills must be materialized into the target repo, and the per-CLI matrix that forces it.
- [monorepo/child-repo-hook-overlay.md](./monorepo/child-repo-hook-overlay.md) — hooks never are: every supported CLI takes out-of-repo hook config.
- [monorepo/agent-cli-hook-capability-matrix.md](./monorepo/agent-cli-hook-capability-matrix.md) — per-CLI hook and plugin capabilities, measured by running the binaries.
- [monorepo/child-repo-hook-telemetry-contract.md](./monorepo/child-repo-hook-telemetry-contract.md) — what a hook may do and report when it runs outside this repo.

## See also (repo root)

- [../README.md](../README.md) — project front door
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — how to contribute
- [../MONOREPO.md](../MONOREPO.md) — monorepo structure and conventions
- [../AGENTS.md](../AGENTS.md) — agent and automation guidelines
