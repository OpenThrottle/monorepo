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

Opt-in and dev-only tooling (React Router DevTools, bundle analyzer, plugin order), **production build profiling** (`pnpm nx run openthrottle-developer:build -- --profile`), and **troubleshooting** (ports, hosts, `API_URL_*` / internal vs external) are in **[docs/monorepo/openthrottle-developer-vite-devtools.md](../../docs/monorepo/openthrottle-developer-vite-devtools.md)**. **Settings → Debug**, **Settings → General**, and **Settings → Appearance** link there (including the profiling section); ports are covered in [local services and ports](./../../docs/monorepo/local-services-and-ports.md).

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

## Unit tests and route fixtures

Vitest + [`app/testing/route-fixtures.tsx`](./app/testing/route-fixtures.tsx) replace Storybook for isolated routing UI. Prioritized modules for snapshots and interaction coverage are listed in **[docs/routing-modules-debug-harness.md](./docs/routing-modules-debug-harness.md)**.

## Prompts UI

- Primary routes: `/prompts`, `/prompts/create`, `/prompts/:promptId`.
- Legacy URLs under `/custom-prompts/*` redirect to the paths above; GraphQL operations still use the `customPrompt` / `customPrompts` fields and related types from the API.

## Skills page (repo skills discovery)

The **Skills** route (`/skills`) lists skills discovered from the monorepo checkout at request time—it does not use a hand-maintained registry in TypeScript.

| Requirement       | Detail                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **On disk**       | `.agents/skills/<slug>/SKILL.md` and `.cursor/skills/<slug>/SKILL.md` under the repo root                                        |
| **When it runs**  | Server-only in the `skills._index` route loader (not in the client bundle)                                                       |
| **Monorepo root** | `WORKSPACE_ROOT` if set to an existing directory; otherwise walk up from `process.cwd()` for `nx.json` and `pnpm-workspace.yaml` |

**Local dev:** Usually works without env when you run via Nx from the monorepo (walk-up finds the root). If the dev server cwd is only the app directory and walk-up fails, set `WORKSPACE_ROOT` in `.env` to the absolute repo path (see commented example in [`.env.default`](./.env.default)).

**Deployed environments (Vercel, Docker without a full checkout):** The Skills table is empty unless the runtime can resolve a root that contains the skill directories—for example mount the repo (or `.agents` / `.cursor` trees) and set `WORKSPACE_ROOT` to that mount. The loader returns an empty list rather than failing the page.

Design and behavior: [docs/repo-skills-discovery-design.md](./docs/repo-skills-discovery-design.md).

## Deployment

The app is configured for [Vercel](https://vercel.com). Deployments are triggered from the connected Git repository.
