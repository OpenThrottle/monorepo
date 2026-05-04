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

## Related docs

- [Local services and ports](./local-services-and-ports.md) — ports, `developer.local`, API URLs.
- [Run OpenThrottle locally (OSS)](../openthrottle/run-locally-oss.md) — full stack overview.

## In-app entry point

**Settings → Debug** (`/settings/debug` in the developer app) links here for a short reminder and a path to this file in the monorepo clone.
