# Cortex integration: cortex-api GraphQL

The extension talks to Cortex via the **cortex-api** GraphQL API (NestJS backend). This keeps one backend for the Cortex web app and the extension; no MCP client runs inside the extension.

## Decision

- **Chosen:** Direct HTTP to **cortex-api** GraphQL endpoint (`POST /graphql`).
- **Not chosen:** MCP client in the extension would require the IDE to host or proxy MCP; HTTP to the existing API is simpler and works the same in VS Code and Cursor.

## Configuration

- **Base URL:** VS Code setting `cortex.apiBaseUrl` (default `http://localhost:6010`). Same base URL as the Cortex web app; the extension appends `/graphql` for operations.
- **Auth:** openthrottle-server requires JWT auth on protected routes. The extension signs in via the `login` mutation (email/password), stores the JWT in `vscode.SecretStorage`, and sends `Authorization: Bearer <token>` on GraphQL requests. See [AUTH_DESIGN.md](./AUTH_DESIGN.md) for the full login flow and token storage design.

## Read path

| Operation                | Use                               |
| ------------------------ | --------------------------------- |
| `listPlansByStatus`      | Tree: plans grouped by status     |
| `listDistinctCategories` | Category quick pick for create    |
| `plan(id)`               | Detail: single plan               |
| `tasksByPlanId(planId)`  | Tree and detail: tasks for a plan |

## Write path (create plan from text)

- **Command:** `Cortex: Create plan from text`. Prompts for a title (natural text), optional category quick pick, then calls `createPlan` with `cortex.defaultAuthor` as author and `pending` status.
- **Mutation:** `createPlan(input: CreatePlanInput!)`. Required: `title`, `author`, `category`. Optional: `description`, `assignee`, `status`, etc.
