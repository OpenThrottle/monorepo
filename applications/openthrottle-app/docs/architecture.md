# openthrottle-app architecture

**Status:** approved 2026-11-07 (OT plan `24f3510f`, task 1 design gate) and built in that plan.
The sections below are the decision record, spike evidence included; [As built](#as-built) lists
where the implementation departed from the proposal. Day-to-day invariants live in
[AGENTS.md](../AGENTS.md).

`openthrottle-app` is an Electron desktop shell around `openthrottle-developer`. It adds no second
UI: every route, loader, action, component and the auth flow come from the developer app's own
production build. The shell owns only what a browser tab cannot do — process lifecycle, a local
origin, window chrome and a small native bridge.

## Decision summary

| Question              | Decision                                                                                                                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime               | **(a) Embedded server.** A `utilityProcess` runs the developer production server build on `127.0.0.1:0`; a sandboxed `BrowserWindow` loads that origin.                                                                                                         |
| Browser → API traffic | The embedded server **reverse-proxies `/graphql` (HTTP and WebSocket upgrade) and `/health`** to the configured OT server, and sets `API_URL_EXTERNAL` to its own origin. The window is fully same-origin; no OT server needs a CORS entry for the desktop app. |
| Electron              | `electron` 45.x (45.2.3 at time of writing) — bundles Node 24.22.2, which satisfies the repo's Node >= 22.                                                                                                                                                      |
| Build (main/preload)  | **electron-vite** for the main and preload bundles. The renderer is _not_ built by electron-vite — it is the developer app's existing build.                                                                                                                    |
| Packaging             | **electron-builder**, fed an explicitly staged directory (never the raw workspace).                                                                                                                                                                             |
| Rejected              | Electron Forge (requires `node-linker=hoisted`), remote shell (b), SPA rebuild (c).                                                                                                                                                                             |

## Runtime options compared

### (a) Embedded server — chosen

Electron's main process forks the developer server build in a `utilityProcess` and the window loads
`http://127.0.0.1:<ephemeral>`.

- Reuses 100% of the routes, server loaders/actions, cookie auth middleware, nonce CSP and
  filesystem skills discovery, unchanged.
- The server runs on a real machine with a real checkout, which is the point of a desktop app
  (local agent CLIs, `WORKSPACE_ROOT`, the IDE engine's `*.server.ts` paths).
- Cost: the app ships a Node server's runtime dependencies (see [Packaging](#packaging)).

### (b) Remote shell — rejected as the default

The window loads a hosted or locally running developer URL. Trivial to build, but it is a bookmark,
not an app: no bundled UI, no offline-of-the-UI start, filesystem features point at whatever machine
hosts the developer server, and the desktop process model buys nothing. It remains a possible
**mode** later (point the window at a hosted developer URL) but not the architecture.

### (c) SPA rebuild (`ssr: false`) — rejected

About 96 of 204 route modules export a server `loader`/`action`, 16 `*.server.ts(x)` modules exist,
auth is HttpOnly-cookie middleware and CSP nonces are minted in `entry.server.tsx`. Converting all of
that to client loaders is a rewrite of the developer app's data layer and would fork its security
model. Not a config flip.

## Spike evidence (2026-11-07)

A ~45-line Node script (express + `@react-router/express` `createRequestHandler`, the same pieces
`react-router-serve` uses) hosted `applications/openthrottle-developer/build/server/index.js`:

| Check                                                                                                                             | Result                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Plain Node 24.15, ephemeral port                                                                                                  | Boots; `/` → `302 /auth` on the **dynamic** origin.                                                         |
| Login with the seeded `developer@openthrottle.ai`                                                                                 | Works; lands on `/dashboard`. Cookie scoped to `127.0.0.1`, so it is isolated from any `localhost` session. |
| Plan detail page (`/plans/24f3510f-…`)                                                                                            | Renders server-side with live data.                                                                         |
| `/auth/ws-token` + graphql-ws handshake to `ws://localhost:6021/graphql` from the dynamic origin                                  | `connection_ack` with the minted token — subscriptions authenticate.                                        |
| CSP                                                                                                                               | `connect-src 'self' http://localhost:6021 ws://localhost:6021`; nonce `script-src` intact.                  |
| **Inside Electron 45.2.3 `utilityProcess`** + hidden sandboxed `BrowserWindow`                                                    | Child reports Node 24.22.2; window renders SSR'd `/auth` with `window.env.APP_URL` = the dynamic origin.    |
| `pnpm --filter openthrottle-developer deploy --prod <dir>`, booted in Electron from **outside** the monorepo, no `WORKSPACE_ROOT` | Boots and renders `/auth`.                                                                                  |

### What broke, and why it shapes the design

1. **CORS on browser-direct HTTP.** `useGlobalMetrics` (`packages/react-router-ui-global`) POSTs to
   `${API_URL_EXTERNAL}/graphql` from the browser. The server's `CORS_ORIGINS` is a fixed list
   (`localhost:6020,…`), so from `127.0.0.1:<random>` the preflight fails. An ephemeral port can never
   be pre-listed, and a hosted OT server will not list a desktop loopback origin either. → the
   same-origin proxy above. Everything else browser-side already goes through same-origin resource
   routes (BFF); the only other direct use is the graphql-ws client and the `/health` footer link.
2. **Env is snapshotted at import.** `@openthrottle/react-router-utils` exports
   `APP_URL = ENV_SOURCE.APP_URL` at module scope. The port must be **bound first**, the origin
   written into the child's env, and only then the server build imported. (Equivalently: the main
   process picks a free port and passes it in, accepting the small bind race; binding inside the
   child is cleaner.)
3. **pnpm strictness.** `express` and `compression` are not dependencies of the developer app; they
   are only reachable through `@react-router/serve`. The shell's server entry declares them itself.
4. **`pnpm deploy` copies `.env`.** The staged directory contained the developer app's local `.env`
   (secrets). Packaging must use an explicit file allowlist, never "copy the deploy dir".
5. **Size.** The `deploy --prod` closure is ~1.1 GB of `node_modules` (`@phosphor-icons` ×2,
   `monaco-editor`, `typescript`, `ts-morph`, rolldown binaries …). The server build itself imports
   only ~25 bare packages. Task 7 traces the real closure (`@vercel/nft` or `ssr.noExternal`) instead
   of shipping the deploy dir.

Not reproduced in the spike: the service worker registration (`/worker.js`) failed in the Claude
browser pane, but `/worker.js` is served `200` with the right body; re-check it inside Electron in
task 3 (127.0.0.1 is a secure context, so it should register).

## Fixed-origin / port assumptions found

| Where                                                      | Assumption                        | Handling                                                                           |
| ---------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| `APP_URL`, `APP_URL_DEVELOPER`, `PORT`                     | Default `http://localhost:6020`   | Shell injects the dynamic origin before import (finding 2).                        |
| `API_URL_EXTERNAL`                                         | Browser talks to `:6021` directly | Shell sets it to its own origin and proxies (finding 1).                           |
| `API_URL_INTERNAL`                                         | Server-side GraphQL base          | Shell injects the configured OT server URL (default `http://localhost:6021`).      |
| `openthrottle-server` `CORS_ORIGINS`                       | Fixed list                        | Not touched — the proxy makes it irrelevant.                                       |
| `app/global/config/csp.ts`                                 | `apiUrl = API_URL_EXTERNAL`       | With the proxy, `connect-src 'self'` covers it; no `additional*Src` change needed. |
| `root.tsx` canonical link, `utils/seo.ts`                  | `APP_URL`                         | Harmless on loopback.                                                              |
| Settings → Ports troubleshooting copy                      | Describes 6020/6021               | Cosmetic; candidate for a desktop-aware note later, not a fork.                    |
| Remaining `APP_URL_*` (admin, CMS, website, email, server) | Required by `getPublicEnv`        | Shell passes the configured values; the CMS one is required even though unused.    |

## Process model

```
Electron main (Node 24.22: lifecycle, menu, deep links, settings.json + window-state.json in userData)
 ├─ utilityProcess: out/main/server.js (src/server/server-entry.ts)
 │    bind 127.0.0.1:0 → set env → post {port} → import developer build/server
 │    express: /__shell/health, static client/, proxy /graphql (+ws) and /health → OT server,
 │             everything else → React Router request handler
 └─ BrowserWindow (contextIsolation, sandbox, no nodeIntegration, no webviews)
      session partition persist:ot-<hash of the OT server origin>
      ├─ http://127.0.0.1:<port>        the developer app; preload exposes window.openthrottleDesktop
      └─ file://…/out/renderer/index.html  connection screen only; preload exposes window.openthrottleShell
```

- `utilityProcess` (not in-process): a crash or a blocking loader cannot freeze the window, and
  the child can be restarted on a settings change (task 5) with fresh env.
- The child reports readiness over its parent port (`process.parentPort.postMessage`) rather than
  stdout parsing, then main health-probes the origin before `loadURL`.
- Dev mode: `openthrottle-app:dev` points the window at the developer Vite dev server on 6020 for
  HMR. `OPENTHROTTLE_APP_MODE=embedded` runs the embedded server from an unpackaged build; a packaged
  app is always embedded.

## Toolchain

All versions checked against the registry on 2026-11-07, not chosen from memory; task 2 installs
with `pnpm add`.

| Tool                 | Version                   | Fit                                                                                                                                                                                                                                                                                                                                     |
| -------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **electron-vite**    | 6.0.0 (peer `vite` ^6–^8) | Builds main + preload with the repo's existing Vite. Bundling matters for the preload: **a sandboxed preload cannot be ESM**, so it must be emitted as a single CJS file, which a bundler does and plain `tsc` nodenext does not. Main can stay ESM. Nx: plain `nx:run-commands` targets (`electron-vite dev/build`); no plugin needed. |
| **electron-builder** | 26.18.0                   | Packaging (`.app`, zip, dmg), `electronFuses`, `asar`. We hand it a pre-staged app directory with an explicit `files` list, so its own pnpm dependency collection is not on the critical path.                                                                                                                                          |
| Electron Forge       | 8.0.1                     | **Rejected.** Forge's docs require `node-linker=hoisted` for pnpm. This workspace deliberately stays on the isolated linker (`node-linker=hoisted` is commented out in `.npmrc`; the related global-virtual-store experiment, OT `77176469`, was NO-GO), and changing the linker repo-wide for one app is not acceptable.               |

Consequence for task 2: `tsconfig` stays ESM + `nodenext` for **typechecking** main/preload (with
`.ts` relative imports via `nodeEsmEslintConfig`), while electron-vite produces the runtime bundles
(ESM main, CJS preload).

## Packaging (task 7)

1. `nx run openthrottle-developer:build`, then `openthrottle-app:build` (electron-vite).
2. `scripts/stage-app.ts` builds `dist/stage/`: the electron-vite `out/`, the developer
   `build/{server,client}` as `developer/`, a generated `package.json`, and a flat `node_modules`
   holding only the `@vercel/nft`-traced runtime closure (36 MB, not the ~1.1 GB `pnpm deploy`
   closure). The stage is an allowlist that refuses any `.env`, and it fails loudly on module
   resolution mismatches or unexpected native files.
3. `electron-builder --projectDir dist/stage` → `dist/release/` (`OpenThrottle.app` + zip). Running
   from the stage bypasses electron-builder's pnpm collector, which shipped the wrong
   `node_modules` from the project dir.

Signing, notarization and auto-update are OT plan `333b0695`.

## Decisions (approved 2026-11-07)

1. Proxy `/graphql` and `/health` through the shell instead of teaching any server's CORS about the
   desktop app.
2. `dev` runs against the 6020 Vite dev server (HMR); the embedded build is for packaged and
   `OPENTHROTTLE_APP_MODE=embedded` runs.
3. electron-vite + electron-builder.

## As built

Where the implementation departed from, or added to, the proposal above:

| Area            | As built                                                                                                                                                          | Why                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Renderer        | One tiny electron-vite renderer: the connection screen (`src/renderer`, react-router-shadcn, strict meta CSP).                                                    | First run and an unreachable server need a screen that is not a developer route. The bundle is about 600 kB JS because of the shadcn barrel. |
| Server choice   | `settings.json` in userData; `OPENTHROTTLE_SERVER_URL` overrides it; the `serverHealth` query is probed before saving.                                            | Task 5.                                                                                                                                      |
| Sessions        | One `persist:ot-<hash>` partition per OT server origin, and every partition gets the permission handlers.                                                         | Cookies never leak between servers, and switching back reuses the old session.                                                               |
| Bridge contract | `@openthrottle/openthrottle-desktop-bridge` package (source-first, no runtime deps).                                                                              | No application → application import. The developer app feature-detects `window.openthrottleDesktop`.                                         |
| Bridge gating   | The preload exposes the desktop bridge only after a sync handshake in which main confirms the current app origin, and main re-validates the sender on every call. | `additionalArguments` cannot carry a port that is picked after the window exists and changes on a child restart.                             |
| Notifications   | Server events → react-router-notifications → bridge → native `Notification`, only while the window is unfocused. The web Notification permission stays denied.    | Avoids duplicating the in-app toast.                                                                                                         |
| Signing         | Ad-hoc (`mac.identity: '-'`), not fully unsigned.                                                                                                                 | A bundle with no seal is SIGKILLed on arm64 once the fuses are flipped.                                                                      |
| Fuses           | `enableCookieEncryption` off.                                                                                                                                     | On macOS it needs a signed app for Keychain access, and it is one-way. Re-enabled in `333b0695`.                                             |
| e2e             | Playwright `_electron` through vitest, as an opt-in `test-e2e` target; local-only.                                                                                | CI has no OT server, Postgres, Redis or seeded user for this project (docs/monorepo/ci-cost.md).                                             |
| Developer app   | Unchanged.                                                                                                                                                        | The proxy made every fixed-origin assumption irrelevant.                                                                                     |
