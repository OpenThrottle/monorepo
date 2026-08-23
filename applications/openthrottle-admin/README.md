# openthrottle-admin

> [!NOTE]
> 🧭 **Planned — not production-ready.** This is the future corporate management layer. It builds and passes CI, but it's an early preview and isn't feature-complete. See the [Project status table](../../README.md#-project-status) in the root README.

OpenThrottle admin UI (React Router, Vite): users, roles, and permissions backed by `openthrottle-server`. See also [applications/openthrottle/README.md](../openthrottle/README.md) for stack-wide setup.

**Technology:**

- [React Router](https://reactrouter.com)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel](https://vercel.com)

## Setup

First-time setup? run `./scripts/setup.sh` instead — it calls this plus install + database

**From the monorepo root:**

```bash
# 🔒 Create or update the environment variables
./scripts/setup_environment.sh

# Run the application
pnpm nx run openthrottle-admin:dev
```
