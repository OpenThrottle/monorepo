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

## Contributor reference

- **Folders & conventions:** [Folders.md](./Folders.md), [openthrottle/packages-naming.md](./openthrottle/packages-naming.md)
- **CI quality gates:** [monorepo/CI-quality-gates.md](./monorepo/CI-quality-gates.md)
- **Dead-code (Knip):** [monorepo/Knip.md](./monorepo/Knip.md)
- **Component shape:** [monorepo/component-primitive-shape.md](./monorepo/component-primitive-shape.md)
- **URL-first UI state:** [monorepo/url-first-ui-state.md](./monorepo/url-first-ui-state.md), [monorepo/url-first-react-router-shadcn-learnings.md](./monorepo/url-first-react-router-shadcn-learnings.md)
- **Testing:** [testing/snapshot-replacement-patterns.md](./testing/snapshot-replacement-patterns.md)
- **PWA:** [monorepo/PWA.md](./monorepo/PWA.md) — the manifest + service-worker wiring every React Router app ships.
- **Marketing / video:** [marketing/README.md](./marketing/README.md) — the @OpenThrottleAI "0–60" format and the screencast production pipeline.
- **UI tokens:** [openthrottle/brand-palette.md](./openthrottle/brand-palette.md), [openthrottle/styles.md](./openthrottle/styles.md)

## See also (repo root)

- [../README.md](../README.md) — project front door
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — how to contribute
- [../MONOREPO.md](../MONOREPO.md) — monorepo structure and conventions
- [../AGENTS.md](../AGENTS.md) — agent and automation guidelines
