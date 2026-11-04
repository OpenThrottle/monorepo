# @openthrottle/nestjs-mcp-developer

Thin re-export shim. This package contains no local implementation — it forwards the OpenThrottle developer Nest MCP surface from [`@openthrottle/openthrottle-mcp`](../openthrottle-mcp). It exists so consumers can depend on a stable `@openthrottle/nestjs-mcp-developer` entry point.

It re-exports the request-scoped auth-token wrappers `withMcpDeveloperAuthToken` and `withMcpDeveloperAuthTokenAsync`, plus everything from `@openthrottle/openthrottle-mcp/nest` (e.g. the Nest MCP module, `NestjsMcpDeveloperService`, and `McpDeveloperMcpSurface`). The actual behaviour lives upstream; change it there, not here.

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-mcp-developer
```

**npm:**

```bash
npm install @openthrottle/nestjs-mcp-developer
```
