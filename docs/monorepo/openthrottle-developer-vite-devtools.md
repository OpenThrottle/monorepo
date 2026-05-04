# openthrottle-developer: Vite and local devtools

This document describes levers wired in `applications/openthrottle-developer/vite.config.ts` for local development and debugging. Use it when tuning the developer portal build or enabling React Router / Vite diagnostics.

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

## In-app entry point

**Settings → Debug** (`/settings/debug` in the developer app) links here for a short reminder and a path to this file in the monorepo clone.
