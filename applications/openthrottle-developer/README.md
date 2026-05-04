# OpenThrottle | Developer

Developer portal for [OpenThrottle](https://developer.openthrottle.ai)—dashboard for plans, projects, notes, generators, and pull requests.

## Tech stack

- [React](https://react.dev) — UI
- [React Router](https://reactrouter.com) — routing and data loading
- [GraphQL](https://graphql.org) — API (via generated types and operations)
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Vite](https://vitejs.dev) — build tooling
- [Vercel](https://vercel.com) — hosting

## Prerequisites

- Node.js ≥ 22
- pnpm

## Setup

```bash
# 🔒 Create or update the environment variables
./scripts/environment.sh

# Run the application
pnpm nx run openthrottle-developer:dev
```

## Local Vite and devtools

Opt-in and dev-only tooling (React Router DevTools, bundle analyzer, plugin order) are documented in **[docs/monorepo/openthrottle-developer-vite-devtools.md](../../docs/monorepo/openthrottle-developer-vite-devtools.md)**. The **Settings → Debug** screen in the app links to the same reference.

## Scripts

Run via Nx from the monorepo root:

| Command                                                   | Description                           |
| --------------------------------------------------------- | ------------------------------------- |
| `pnpm nx run openthrottle-developer:dev`                  | Start dev server                      |
| `pnpm nx run openthrottle-developer:build`                | Production build                      |
| `pnpm nx run openthrottle-developer:lint`                 | Lint                                  |
| `pnpm nx run openthrottle-developer:test`                 | Unit tests                            |
| `pnpm nx run openthrottle-developer:typecheck`            | TypeScript check                      |
| `pnpm nx run openthrottle-developer:codegen-graphql`      | Generate GraphQL types and operations |
| `pnpm nx run openthrottle-developer:codegen-react-router` | Generate React Router route types     |

## Prompts UI

- Primary routes: `/prompts`, `/prompts/create`, `/prompts/:promptId`.
- Legacy URLs under `/custom-prompts/*` redirect to the paths above; GraphQL operations still use the `customPrompt` / `customPrompts` fields and related types from the API.

## Deployment

The app is configured for [Vercel](https://vercel.com). Deployments are triggered from the connected Git repository.
