# openthrottle-email

> [!WARNING]
> 🚧 **Experimental prototype.** A web mail client we're building in the open. It compiles and passes CI, but it's a work in progress — expect rough edges and don't depend on it yet. See the [Project status table](../../README.md#-project-status) in the root README.

Web-based email client (React Router v8, flat routes). Uses **@openthrottle/react-router-shadcn** for all UI. Routes and components are scaffolded via **@tools/generators** (see monorepo `docs/tools/templates/AGENT_USAGE.md`).

**Technology:**

- [React Router](https://reactrouter.com/) v8 (flat file-based routes)
- [React](https://reactjs.org)
- [TailwindCSS](https://tailwindcss.com)
- [Vercel](https://vercel.com)

## Documentation

- **Architecture and generators:** [docs/Architecture.md](./docs/Architecture.md) — route tree, layout, `@tools/generators` usage, and the shadcn-ui component conventions.
- **Agent notes and gotchas:** [AGENTS.md](./AGENTS.md)

Do not remove code comments (markers) in components or routes; they guide future integration.

## Setup

First-time setup? run `./scripts/setup.sh` instead — it calls this plus install + database

**From the monorepo root:**

```bash
# 🔒 Create or update the environment variables
./scripts/setup_environment.sh

# Run the application
pnpm nx run openthrottle-email:dev
```
