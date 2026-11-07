# openthrottle-app

OpenThrottle as a desktop app. It is an Electron shell around
[`openthrottle-developer`](../openthrottle-developer) and adds no second UI. Plans, tasks, projects,
the IDE, skills and settings are the developer app's own production build. The shell runs that
build on a private loopback port and adds what a browser tab can't: a real local checkout, native
notifications, `openthrottle://` links and window state.

It still needs an OpenThrottle server (`openthrottle-server`); there is no offline mode.

## Run it

Start a local OT server first (`pnpm nx run openthrottle-server:dev`, which serves `:6021`).

```bash
pnpm nx run openthrottle-app:dev    # window on the developer Vite dev server (:6020, HMR)
```

To run the embedded server the way a packaged app does, from an unpackaged build:

```bash
pnpm nx run openthrottle-app:build
OPENTHROTTLE_APP_MODE=embedded pnpm --filter openthrottle-app exec electron .
```

## Point it at a server

On first launch, or whenever the saved server stops answering, the app shows a connection screen.
Enter the server's URL (for example `http://localhost:6021` or a hosted server's `https://` URL).
The app checks the server's health before saving. **File → Change Server…** switches servers later.
Each server keeps its own sign-in session.

`OPENTHROTTLE_SERVER_URL` overrides the saved server, which is useful for scripts and tests.

## Package it

```bash
pnpm nx run openthrottle-app:package
```

This produces `dist/release/mac-arm64/OpenThrottle.app` and a zip. The build is ad-hoc signed only,
so macOS treats it as unsigned: open it with right-click → **Open** the first time. Developer ID
signing, notarization and auto-update aren't done yet.

## Quality gates

```bash
pnpm nx run openthrottle-app:lint
pnpm nx run openthrottle-app:typecheck
pnpm nx run openthrottle-app:test
pnpm nx run openthrottle-app:test-e2e   # local-only; needs the OT server on :6021 with the seeded user
```

Design and decisions: [docs/architecture.md](./docs/architecture.md). Agent notes and invariants:
[AGENTS.md](./AGENTS.md).

## License

Apache-2.0. See [LICENSE.md](./LICENSE.md).
