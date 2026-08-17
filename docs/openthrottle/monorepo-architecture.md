# OpenThrottle monorepo architecture

This document describes how the OpenThrottle applications and packages in the monorepo fit together. It uses Mermaid diagrams and short narratives; see also `applications/openthrottle/README.md` and `databases/README.md`.

## Task breakdown (for this plan)

To complete the plan “Monorepo architecture diagram for OpenThrottle”, the following tasks were identified:

1. **Breakdown the request** — Define the tasks needed to deliver the doc (this task).
2. **Audit apps and packages** — List OpenThrottle applications and `packages/openthrottle/*` with roles and dependencies.
3. **Add high-level architecture diagram** — Mermaid: apps, packages, OpenThrottle DB and their connections.
4. **Add data/request flow diagram** — Mermaid: Developer/MCP → Server → Postgres; Ralph/workflows.
5. **Write single new markdown file** — This file: narrative + diagrams in `docs/openthrottle/monorepo-architecture.md`.

---

## High-level architecture

OpenThrottle consists of **applications** (deployable apps) and **packages** (shared libraries). The backend is **openthrottle-server** (NestJS + GraphQL); it talks to **OpenThrottle** (Postgres with pgvector) via **@openthrottle/nestjs-repositories**. The **openthrottle-mcp** MCP and the **openthrottle-developer** UI both call the server’s GraphQL API; the MCP uses **@openthrottle/nodejs-graphql** as a typed GraphQL client. **Ralph** and other workflows in **@tools/workflows** drive the agentic loop and optionally stream output to OpenThrottle.

```mermaid
flowchart TB
  subgraph Applications["Applications"]
    Server["openthrottle-server<br/>(NestJS, GraphQL)"]
    Developer["openthrottle-developer<br/>(React Router)"]
    Admin["openthrottle-admin"]
    Email["openthrottle-email"]
    Website["openthrottle-website"]
  end

  subgraph Packages["Packages (@openthrottle)"]
    MCP["openthrottle-mcp<br/>(MCP server)"]
    NodeGraphQL["nodejs-graphql<br/>(GraphQL client)"]
    NestRepos["nestjs-repositories<br/>(TypeORM, OpenThrottle)"]
    Notifications["notifications"]
    ReactRouterAuth["react-router-auth"]
    ReactRouterGraphQL["react-router-graphql"]
    ReactRouterUI["react-router-ui"]
  end

  subgraph Data["Data & workflows"]
    OpenThrottle["OpenThrottle (Postgres + pgvector)"]
    Redis["Redis"]
    Workflows["@tools/workflows<br/>(Ralph, link-merge)"]
  end

  Developer -->|HTTP/WS| Server
  MCP -->|GraphQL| Server
  MCP --> NodeGraphQL
  Server --> NestRepos
  NestRepos --> OpenThrottle
  Server --> Redis
  Workflows -->|GraphQL or link-merge| Server
  Workflows -.->|optional append_plan_output| OpenThrottle
```

---

## Data and request flow

- **openthrottle-developer**: Browser app; calls `API_URL` (openthrottle-server) for GraphQL and optional WebSocket (e.g. realtime, notifications).
- **openthrottle-mcp**: MCP server used by Cursor/other hosts; uses `@openthrottle/nodejs-graphql` to talk to openthrottle-server GraphQL (plans, tasks, search, commit links, plan output stream, etc.). No direct Postgres access.
- **openthrottle-server**: NestJS app; GraphQL API, auth (JWT), queues (BullMQ/Redis), and **NestjsRepositoriesModule** (`@openthrottle/nestjs-repositories`) for OpenThrottle (plans, tasks, embeddings, commit_links, plan_output_stream, docs, users, RBAC). Optional OpenAI or Ollama for embeddings.
- **Ralph** (`workflow-ralph`): Loads plan/tasks from OpenThrottle (via server or env), runs the agent loop, updates task status from agent output; can append iteration output to OpenThrottle `plan_output_stream`. Commit linking is done only after PR merge via `workflow-link-merge`.

```mermaid
sequenceDiagram
  participant Dev as openthrottle-developer
  participant MCP as openthrottle-mcp
  participant Client as @openthrottle/nodejs-graphql
  participant Server as openthrottle-server
  participant Repos as @openthrottle/nestjs-repositories
  participant OpenThrottle as OpenThrottle (Postgres)
  participant Ralph as workflow-ralph

  Dev->>Server: GraphQL / WebSocket
  MCP->>Client: GraphQL operations
  Client->>Server: HTTP GraphQL
  Server->>Repos: TypeORM / services
  Repos->>OpenThrottle: SQL
  Ralph->>Server: get plan/tasks, append_plan_output (optional)
  Ralph->>OpenThrottle: (via server or config) task status updates
```

---

## Applications (summary)

| Application                | Role                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **openthrottle-server**    | NestJS GraphQL API; auth, plans, tasks, embeddings, commit links, docs, users, RBAC; BullMQ queues; talks to OpenThrottle via `@openthrottle/nestjs-repositories`. |
| **openthrottle-developer** | React Router UI for developers; plans, tasks, search, commit links; configurable `API_URL` to the server.                                                          |
| **openthrottle-admin**     | Admin portal (see `docs/openthrottle/admin-portal-architecture.md`).                                                                                               |
| **openthrottle-email**     | Email-related services.                                                                                                                                            |
| **openthrottle-website**   | Marketing website.                                                                                                                                                 |

Shared infra used by the server: **Postgres** (OpenThrottle schema in `databases/`), **Redis** (BullMQ, sessions, etc.). Docker Compose for the core stack: the repo-root `docker-compose.yml` (run `docker compose up --build` from the monorepo root).

---

## Packages (summary)

| Package                                      | Role                                                                                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **@openthrottle/openthrottle-mcp**           | MCP server exposing OT tools (plans, tasks, search, commit links, plan output, etc.); depends on `@openthrottle/nodejs-graphql` to call openthrottle-server.                  |
| **@openthrottle/nodejs-graphql**             | Typed GraphQL client for Node (used by openthrottle-mcp); no direct DB.                                                                                                       |
| **@openthrottle/nestjs-repositories**        | TypeORM-based data access for OpenThrottle (plans, tasks, embeddings, commit_links, plan_output_stream, documentation, users, roles, etc.); used only by openthrottle-server. |
| **@openthrottle/openthrottle-notifications** | Notifications (e.g. used by server/developer).                                                                                                                                |
| **@openthrottle/react-router-\***            | Shared React Router libs (auth, GraphQL, UI, utils, editor, profiling, chat) for the developer and other OT UIs.                                                              |

---

## Related docs

- **OpenThrottle schema and usage:** `databases/README.md`
- **Run locally (OSS/Ollama):** `docs/openthrottle/run-locally-oss.md`
- **Docker image strategy:** `docs/openthrottle/docker-image-build-strategy.md`
- **Ralph and workflows:** `tools/workflows/README.md`, `AGENTS.md`
- **MCP developer setup:** `packages/openthrottle-mcp/README.md`
