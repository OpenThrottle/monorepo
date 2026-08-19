# OpenThrottle documentation

Start here to navigate the docs. New to the repo? Follow **Getting started** top to
bottom, then dip into **Usage & reference** as needed.

## Getting started

- [local-quickstart.md](./openthrottle/local-quickstart.md) — fresh clone → running server + verified MCP, in order.
- [run-openthrottle-server-developer.md](./openthrottle/run-openthrottle-server-developer.md) — minimal native path for daily dev (server + developer app).
- [run-locally-oss.md](./openthrottle/run-locally-oss.md) — running the whole stack on open-source models (Ollama) with no cloud APIs.
- [first-time-onboarding.md](./openthrottle/first-time-onboarding.md) — mental model + a copy-paste prompt sequence for your first end-to-end workflow.
- [mcp-registration.md](./openthrottle/mcp-registration.md) — register `openthrottle-mcp` in Cursor / Claude Code / other MCP hosts.
- [authoring-plans-via-mcp.md](./openthrottle/authoring-plans-via-mcp.md) — create and manage plans/tasks from your editor via MCP.

## What OpenThrottle is

- [features.md](./openthrottle/features.md) — product overview: plans, tasks, semantic search, agentic execution (Ralph), dashboard.
- [monorepo-architecture.md](./openthrottle/monorepo-architecture.md) — how the apps and packages fit together (diagrams).
- [../databases/README.md](../databases/README.md) — Postgres schema, migrations, embeddings, imports.

## Usage & reference

- **Local services:** [monorepo/local-services-and-ports.md](./monorepo/local-services-and-ports.md), [Docker_Compose.md](./Docker_Compose.md)
- **Worktrees:** [monorepo/worktree-port-allocation.md](./monorepo/worktree-port-allocation.md)
- **Nx:** [monorepo/NX.md](./monorepo/NX.md), [monorepo/nx-graph.md](./monorepo/nx-graph.md), [monorepo/NX/tags.md](./monorepo/NX/tags.md)
- **Generators:** [tools/templates/](./tools/templates/AGENT_USAGE.md) — scaffold routes, components, packages, services.
- **Skills:** [Skills.md](./Skills.md) — the agent-skills policy and `skill-sync`.
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
- **UI tokens:** [openthrottle/brand-palette.md](./openthrottle/brand-palette.md), [openthrottle/styles.md](./openthrottle/styles.md)

## See also (repo root)

- [../README.md](../README.md) — project front door
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — how to contribute
- [../MONOREPO.md](../MONOREPO.md) — monorepo structure and conventions
- [../AGENTS.md](../AGENTS.md) — agent and automation guidelines
