# OpenThrottle | Website

Marketing and landing site for [OpenThrottle](https://openthrottle.ai)—documentation, legal pages, and product information.

## Tech stack

- [React](https://react.dev) — UI
- [React Router](https://reactrouter.com) — routing and data loading
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Vite](https://vitejs.dev) — build tooling
- [Vercel](https://vercel.com) — hosting

## Prerequisites

- Node.js ≥ 22
- pnpm

## Setup

From the **monorepo root**:

```bash
# 🔒 Create or update the environment variables (copies each app’s `.env.default` to `.env`)
./scripts/environment.sh

pnpm nx run openthrottle-website:dev
```

### Environment variables

Shared URL and app identity values are read through `@openthrottle/react-router-utils` (see `getEnvironment` in `packages/openthrottle/react-router-utils`). The local template is [`.env.default`](./.env.default); it must stay aligned with that helper (for example `API_URL_*`, `APP_*`, `NODE_ENV`, `ROLLBAR_TOKEN`). `vite.config.ts` loads all keys from `.env` into `process.env` for dev and build—there is no separate `VITE_*` app surface for these.

Optional: `OFFLINE_MODE=true` serves an offline placeholder from `entry.server.tsx`. `COOKIE_SECRET` defaults in code if unset.

## Deployment

The app is configured for [Vercel](https://vercel.com). Deployments are triggered from the connected Git repository. Configure the same variables as in `.env.default` in the Vercel project (plus `VERCEL`, set automatically). `react-router.config.ts` enables the Vercel preset when `VERCEL=1`.

## Scripts

Run via Nx from the monorepo root:

| Command                                      | Description      |
| -------------------------------------------- | ---------------- |
| `pnpm nx run openthrottle-website:dev`       | Start dev server |
| `pnpm nx run openthrottle-website:build`     | Production build |
| `pnpm nx run openthrottle-website:lint`      | Lint             |
| `pnpm nx run openthrottle-website:test`      | Unit tests       |
| `pnpm nx run openthrottle-website:typecheck` | TypeScript check |
