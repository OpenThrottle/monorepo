# @openthrottle/nestjs-openthrottle-mcp

Thin re-export shim. This package contains no local implementation — it forwards the OpenThrottle developer Nest MCP surface from [`@openthrottle/openthrottle-mcp`](../openthrottle-mcp). It exists so consumers can depend on a stable `@openthrottle/nestjs-openthrottle-mcp` entry point.

It re-exports the request-scoped auth-token wrappers `withMcpDeveloperAuthToken` and `withMcpDeveloperAuthTokenAsync`, plus everything from `@openthrottle/openthrottle-mcp/nest` (e.g. the Nest MCP module, `NestjsMcpDeveloperService`, and `McpDeveloperMcpSurface`). The actual behaviour lives upstream; change it there, not here.

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-openthrottle-mcp
```

**npm:**

```bash
npm install @openthrottle/nestjs-openthrottle-mcp
```
