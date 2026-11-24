# packages/

The shared libraries in the OpenThrottle monorepo. Each package is an Nx project named for its npm name, with its own README. What the families share (which ones are built, which are consumed source-first, import rules, the server/client boundary) is in [AGENTS.md](./AGENTS.md).

## Families

- **`@openthrottle/nestjs-*`**: NestJS server modules consumed by `openthrottle-server`, such as [`nestjs-auth`](./nestjs-auth/README.md), [`nestjs-bullmq`](./nestjs-bullmq/README.md), [`nestjs-graphql`](./nestjs-graphql/README.md) and [`nestjs-repositories-server`](./nestjs-repositories-server/README.md) (the `openthrottle` database's TypeORM layer). Always built: they ship `dist/`.
- **`@openthrottle/react-router-*`**: UI and client libraries consumed source-first by the React Router apps, such as [`react-router-shadcn`](./react-router-shadcn/README.md) (the component library), [`react-router-ui-global`](./react-router-ui-global/README.md) and [`react-router-testing`](./react-router-testing/README.md). No `build` target by design.
- **`@openthrottle/openthrottle-agentic-*` and `@openthrottle/agentic-*`**: the agentic tooling. [`openthrottle-agentic-loop`](./openthrottle-agentic-loop/README.md) is the OT Loop runner that executes every plan run; [`openthrottle-agentic-utils`](./openthrottle-agentic-utils/README.md) and [`openthrottle-drivers`](./openthrottle-drivers/README.md) sit under it, and [`agentic-hooks`](./agentic-hooks/README.md) holds the lifecycle hooks.
- **[`@openthrottle/openthrottle-mcp`](./openthrottle-mcp/README.md)**: the OT MCP server. It also owns the shared plan, task, note and project GraphQL documents.

The other `openthrottle-*` packages are product libraries (`openthrottle-ide`, `openthrottle-skills`, `openthrottle-notifications`, `openthrottle-showroom` and more), and a few one-offs sit outside every prefix: `graphql-codegen`, `node-client`, `nodejs-graphql` and `nodejs-utils`.

## Using a package

From outside the monorepo, install a published package:

```bash
pnpm add @openthrottle/nestjs-auth
```

Inside the monorepo, depend on it with `workspace:^` and import its main entry only (no deep imports).

## Working on a package

```bash
pnpm nx run @openthrottle/nestjs-auth:test
pnpm nx run @openthrottle/react-router-shadcn:lint
pnpm nx run @openthrottle/openthrottle-agentic-loop:typecheck
```

`typecheck` checks types and never executes tests; only `test` runs Vitest. A source-first package has no `build`, so check it through a consumer app, for example `pnpm nx run openthrottle-developer:build`.

New packages come from the generator, not from copying a sibling: see the [`ot-generators`](../skills/ot-generators/SKILL.md) skill.
