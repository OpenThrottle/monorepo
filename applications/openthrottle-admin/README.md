# openthrottle-admin

OpenThrottle admin UI (React Router, Vite): users, roles, and permissions backed by `openthrottle-server`. See also [applications/openthrottle/README.md](../openthrottle/README.md) for stack-wide setup.

**Technology:**

- [React Router](https://reactrouter.com)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel](https://vercel.com)

## Setup

From the monorepo root:

```bash
# 🔒 Create or update the environment variables
./scripts/environment.sh

# Run the application
pnpm nx run openthrottle-admin:dev
```
