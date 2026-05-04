# openthrottle-developer: Vite and local devtools

This document describes levers wired in `applications/openthrottle-developer/vite.config.ts` for local development and debugging. Use it when tuning the developer portal build or enabling React Router / Vite diagnostics.

## Quick reference

Use this table to pick a lever before reading the sections below.

| Goal                                                      | Lever                                                                                                                                     |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Bundle composition, duplicate dependencies, chunk splits  | Dev-only `vite-bundle-analyzer` when `NODE_ENV=development` — see [Development-only: bundle analyzer](#development-only-bundle-analyzer). |
| Slow **production** builds (where Rollup/Vite spends CPU) | `pnpm nx run openthrottle-developer:build -- --profile` — see [Vite CLI build profiling](#vite-cli-build-profiling).                      |
| Routes, loaders, actions, navigation                      | `REACT_ROUTER_DEV_TOOLS=true` — see [Opt-in: React Router DevTools](#opt-in-react-router-devtools).                                       |
| Noisy plugin / transform tracing (debug sessions only)    | Prefix the command with `DEBUG=vite:*` — see the note under [Vite CLI build profiling](#vite-cli-build-profiling).                        |

## Plugin order (important)

`reactRouterDevTools()` **must** run before `reactRouter()` from `@react-router/dev/vite`. The config already follows that order.

## Opt-in: React Router DevTools

- **Env:** `REACT_ROUTER_DEV_TOOLS=true` (see `applications/openthrottle-developer/.env.default` if present).
- **Effect:** Registers `reactRouterDevTools()` so the in-app React Router debugging UI can attach.
- **When to enable:** While inspecting routes, loaders, actions, or navigation during feature work. Omit in day-to-day runs if you want a cleaner console and slightly less overhead.

## Always-on in this config

- **`vite-plugin-devtools-json` (`devtoolsJson()`):** Exposes structured metadata for browser DevTools integration (project/Vite context). Safe to leave enabled in dev.
- **`@tailwindcss/vite`, `vite-tsconfig-paths`, `reactRouter()`:** Standard app pipeline—not “debug” toggles.

## Development-only: bundle analyzer

- **Condition:** `NODE_ENV === 'development'` enables `vite-bundle-analyzer` (`analyzer()` from `vite-bundle-analyzer`).
- **When to use:** Investigating bundle composition, duplicate dependencies, or chunk splits. Expect analyzer UI or output when running `pnpm nx run openthrottle-developer:dev` (behavior depends on the analyzer plugin defaults).
- **When to skip:** If the overlay or extra work gets in the way, run a normal dev session without focusing on bundle stats; the plugin is dev-gated, not production.

## Vite CLI build profiling

Use this when **production builds are slow** or you need to see **where Rollup/Vite spends time** (transforms, plugins). This is separate from the dev-only bundle analyzer above.

- **Command (from monorepo root):**  
  `pnpm nx run openthrottle-developer:build -- --profile`  
  Vite writes a Chrome-compatible CPU profile (typically `vite-profile-*.cpuprofile` under the app directory). Open it in Chrome DevTools → **Performance** → load profile.
- **Alternative:** From `applications/openthrottle-developer`, run  
  `pnpm exec vite build --profile`  
  (same output; use whichever matches how you usually invoke builds).

**When to enable:** Narrowing down slow plugins or expensive transforms during CI or local production builds. **When to skip:** Day-to-day iteration—prefer the dev bundle analyzer for dependency overlap unless the bottleneck is clearly build-time CPU.

**Related:** Verbose Vite logging can help trace plugin order issues: prefix the command with `DEBUG=vite:*` (noisy; use only while debugging).

## Server / host notes

- **Port:** `PORT` from env, else Vite falls back to **3000** in this config (`vite.config.ts`). The template in `.env.default` may use another port (e.g. **6020**); align with [local services and ports](./local-services-and-ports.md).
- **`allowedHosts`:** Includes `developer.local` for local HTTPS / hostname setups.

## Troubleshooting: ports, hosts, and API base URLs

Use this when the dev server runs but navigation, loaders, or GraphQL calls fail inconsistently.

### Port mismatch

- **Symptom:** You open `http://localhost:3000` but `.env.default` expects **6020**, or the reverse—blank page, wrong app, or WS/API pointing at the wrong process.
- **Fix:** Set `PORT` in `applications/openthrottle-developer/.env` to match how you browse the app, or browse the port Vite prints on startup. See `vite.config.ts` (`server.port`).

### Internal vs external GraphQL URLs

- **`API_URL_EXTERNAL`:** Used for browser-side requests; must be reachable from **your machine’s browser** (or the user’s).
- **`API_URL_INTERNAL`:** Used for server-side / SSR fetches in this app; must be reachable from **the Node process** running the React Router dev server.
- **Symptom:** Data loads on first paint but breaks after client navigation—or the opposite—often indicates one URL works in one context and not the other.
- **Fix:** In typical local monorepo dev, both point at the same `openthrottle-server` origin (e.g. `http://localhost:6021` per `.env.default`). In Docker, split hostnames: the browser may use `http://localhost:6021` while the dev server container might need `http://host.docker.internal:6021` (Docker Desktop) or the host LAN IP for the API.

### `localhost` inside containers

- From **inside a container**, `localhost` refers to that container, not your host. Use **`host.docker.internal`** (macOS/Windows Docker Desktop) or documented host-gateway patterns so server-side loaders hit the API on the host.

### Hostnames (`developer.local`, Caddy)

- For Option B (separate hosts) in [local services and ports](./local-services-and-ports.md), add entries to `/etc/hosts` and ensure `APP_URL_*` values match the URLs you actually use. Vite already allows `developer.local` in `allowedHosts`.

### Related docs

- [Local services and ports](./local-services-and-ports.md) — full port table, Caddy options, WebSocket notes.

## Related docs

- [Local services and ports](./local-services-and-ports.md) — ports, `developer.local`, API URLs.
- [Run OpenThrottle locally (OSS)](../openthrottle/run-locally-oss.md) — full stack overview.

## In-app entry points

- **Settings → Debug** (`/settings/debug`) — bundle analyzer / React Router DevTools reminders and links to this doc. The same page includes **Local dev: ports, hosts & API URLs** (fragment `/settings/debug#ports-hosts-api-troubleshooting`) with internal vs external API bases, `PORT` / Vite, Docker, and Caddy notes.
- **Settings → General** and **Settings → Appearance** — **Build & environment** plus **Local Vite profiling** card with doc links (including [Quick reference](#quick-reference) and [Vite CLI build profiling](#vite-cli-build-profiling)) so contributors discover profiling without hunting the README. The **App & API URL matrix** on those routes links back to the ports troubleshooting section on Debug.
