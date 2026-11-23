# applications/

The deployable apps in the OpenThrottle monorepo. Each one is an Nx project with its own README; conventions shared across the family (ports, env files, React Router layout, E2E) are in [AGENTS.md](./AGENTS.md).

## Deployable apps

- [`openthrottle-server`](./openthrottle-server/README.md): the NestJS backend. It owns the code-first GraphQL API, the queues and the plan-run jobs.
- [`openthrottle-developer`](./openthrottle-developer/README.md): the developer UI (React Router) for plans, projects, queues, pull requests and usage.
- [`openthrottle-admin`](./openthrottle-admin/README.md): the admin UI (React Router) for users, roles and permissions. Planned, not production-ready.
- [`openthrottle-website`](./openthrottle-website/README.md): the marketing and documentation site (React Router).
- [`openthrottle-app`](./openthrottle-app/README.md): the Electron desktop shell around the developer app's production build.

## Also in this folder

- [`openthrottle-workbench`](./openthrottle-workbench/README.md): a Storybook host for `@openthrottle/react-router-shadcn`. A local dev tool, never deployed.
- [`openthrottle-cms`](./openthrottle-cms/README.md): the content CMS app, still in flight.
- [`openthrottle/`](./openthrottle/README.md): the standalone consumer install (docker compose and Dockerfiles running published images). Not an Nx project.

## Running one

```bash
pnpm nx run openthrottle-server:dev      # GraphQL API
pnpm nx run openthrottle-developer:dev   # Developer UI
```

Setup, the full command list and the local port map are in the root [README](../README.md) and [AGENTS.md](./AGENTS.md).
