# T3 Code teardown: how it ships and runs as a standalone install

Source: `pingdotgg/t3code`, default branch HEAD **`0bb6eaa546c91915efbd3f092088c694f3949709`** (shallow clone, 2026-11-12).
Citations use `pingdotgg/t3code/<path>@0bb6eaa546c9`. Release data: `gh api repos/pingdotgg/t3code/releases/latest` → **v0.1.9**, published 2026-11-11 (HEAD may be slightly ahead of the tag).

## 1. Desktop shell and UI loading

- **Electron 44**, built with electron-builder 26 and updated with electron-updater 6. There is no Tauri.
  `pingdotgg/t3code/apps/desktop/package.json@0bb6eaa546c9` (`"electron": "44.10.1"`, `electron-builder`, `electron-updater`).
- Entry: `boot.cjs` requires a V8 compile cache, then `main.cjs`, which builds the whole main process as Effect layers.
  `pingdotgg/t3code/apps/desktop/src/boot.ts@0bb6eaa546c9`, `pingdotgg/t3code/apps/desktop/src/main.ts@0bb6eaa546c9`.
- **The UI is a bundled renderer served over a privileged custom scheme, `t3code://app/`.** It is not a remote URL and does not go through the backend's HTTP server. In production, `protocol.handle` reads files from `apps/server/dist/client` and falls back to `index.html` for SPA routes. In dev it proxies to the Vite dev server under `t3code-dev://`. A CSP header is injected on every response.
  `pingdotgg/t3code/apps/desktop/src/electron/ElectronProtocol.ts@0bb6eaa546c9` (scheme `t3code`, `registerSchemesAsPrivileged` with `standard/secure/supportFetchAPI/codeCache`; `serveDesktopAsset`).
  `pingdotgg/t3code/apps/desktop/src/app/DesktopApp.ts@0bb6eaa546c9` (L182: `assetDirectory: environment.clientAssetsDir` when packaged, `targetOrigin: devServerUrl` in dev).
  `pingdotgg/t3code/apps/desktop/src/app/DesktopEnvironment.ts@0bb6eaa546c9` (`clientAssetsDir = <serverRoot>/apps/server/dist/client`).
- The web app is a client SPA (`apps/web`). It talks to the local backend over HTTP and WebSocket on `127.0.0.1:<port>`. The loopback URLs are built in `pingdotgg/t3code/apps/desktop/src/backend/DesktopServerExposure.ts@0bb6eaa546c9` (L115–116).
- A main window loads `getDesktopUrl()`. A data-URL splash ("Connecting to WSL…") and a data-URL startup-recovery page cover the failure cases.
  `pingdotgg/t3code/apps/desktop/src/window/DesktopWindow.ts@0bb6eaa546c9` (L448, L864, L1093), `pingdotgg/t3code/apps/desktop/src/app/DesktopStartupRecovery.ts@0bb6eaa546c9`.

## 2. Where the backend runs and how it is supervised

- **It is a separate child process: the Electron binary re-run as Node.** It is not a `utilityProcess` and not a separate binary. The spawn uses `process.execPath` with `ELECTRON_RUN_AS_NODE=1`, entry `apps/server/dist/bin.mjs`, plus `--bootstrap-fd 3`. On macOS and Linux the entry sits inside `app.asar`. On Windows it lives in a separate `resources/server.asar`.
  `pingdotgg/t3code/apps/desktop/src/backend/DesktopBackendConfiguration.ts@0bb6eaa546c9` (L527–546), `pingdotgg/t3code/apps/desktop/src/app/DesktopEnvironment.ts@0bb6eaa546c9` (L165–169, `backendEntryPath`).
- The same server ships as the standalone `t3` CLI (npm `bin: t3`). Desktop mode is just `mode: "desktop"` in the bootstrap payload, so the server code is identical. `pingdotgg/t3code/apps/server/package.json@0bb6eaa546c9`.
- **Bootstrap over file descriptors, not env or argv.** A JSON payload goes in on fd3: port, host, `t3Home`, a desktop bootstrap token and secret, and flags. Extra fds carry telemetry (fd4/5) and a desktop-browser control channel (fd6/7). WSL backends get it on stdin, because `wsl.exe` drops extra fds. Later shell-environment updates also travel on fd4.
  `pingdotgg/t3code/apps/desktop/src/backend/DesktopBackendManager.ts@0bb6eaa546c9` (L413–480), `pingdotgg/t3code/apps/server/src/resourceTelemetry/DesktopTelemetryReceiver.ts@0bb6eaa546c9` (L230–271).
- **Port.** The default is **3773**, scanned upward until a port is free on every probe host. `T3CODE_PORT` or config overrides it.
  `pingdotgg/t3code/apps/desktop/src/app/DesktopApp.ts@0bb6eaa546c9` (L44, L85–120).
- **Readiness.** The desktop polls `GET /.well-known/t3/environment` every 100 ms, with a 1 s request timeout and a **3-minute** overall budget ("large state databases can take over a minute"). The budget is extended while the server logs that migrations are running (`isRunningDatabaseMigrations`).
  `pingdotgg/t3code/apps/desktop/src/backend/DesktopBackendManager.ts@0bb6eaa546c9` (L36–55, L28).
- **Crash restart.** Exponential backoff starts at 500 ms (`500ms·2^n`) and caps at 10 s. After 3 restarts without readiness it shows a startup-failure report. A managed-policy exit code reports immediately, and a dedicated "state dir owned" exit code is handled separately. The counter resets after a ready run.
  Same file: L305–306 (`calculateRestartDelay`), L1015–1060 (`scheduleRestart`), L833–953.
- **Shutdown.** The desktop sends SIGTERM, allows a **5 s grace** (matching the server's provider-session stop budget), then SIGKILL, with a total quit budget of grace + 2 s. All pool instances stop concurrently on quit. A repeated Quit or SIGTERM forces exit if shutdown stalls. On Linux, a synchronous `process.on("exit")` sweep walks `/proc/<pid>/task/*/children` and TERM/KILLs any stragglers.
  `pingdotgg/t3code/apps/desktop/src/backend/DesktopBackendManager.ts@0bb6eaa546c9` (L44–51, L468–469), `pingdotgg/t3code/apps/desktop/src/app/DesktopApp.ts@0bb6eaa546c9` (L160–168), `pingdotgg/t3code/apps/desktop/src/app/DesktopLifecycle.ts@0bb6eaa546c9` (L111–307), `pingdotgg/t3code/apps/desktop/src/app/DesktopExitChildren.ts@0bb6eaa546c9`.
- **Single instance, two layers:**
  1. Electron's `requestSingleInstanceLock()` runs before ready. A second instance quits, and its argv is queued for `second-instance`. `pingdotgg/t3code/apps/desktop/src/app/DesktopClerk.ts@0bb6eaa546c9` (L114–130).
  2. **A server-side ownership lock on the data dir.** The server holds a `BEGIN EXCLUSIVE` transaction on `<stateDir>/server-owner.sqlite` for its lifetime. The OS releases it on any exit, including SIGKILL, so a crashed owner never blocks the next start. Before spawning, the desktop checks for a live owner (for example a standalone `t3` service on the same `~/.t3`). If it finds one, it shows an error box and quits.
     `pingdotgg/t3code/apps/server/src/serverOwnership.ts@0bb6eaa546c9` (L172–193), `pingdotgg/t3code/apps/desktop/src/backend/DesktopHomeOwner.ts@0bb6eaa546c9`, `pingdotgg/t3code/apps/desktop/src/app/DesktopApp.ts@0bb6eaa546c9` (bootstrap, "another server owning the T3 home").
- **Local auth.** The desktop mints a bootstrap token and secret per launch. The renderer authenticates to the loopback server with them, so the open localhost port is not unauthenticated. `pingdotgg/t3code/apps/desktop/src/backend/DesktopLocalEnvironmentAuth.ts@0bb6eaa546c9`.
- **Pool.** There can be several backends: the primary local one, a WSL one on Windows (`wsl.exe` + staged Linux runtime), and SSH-tunnelled remote ones. `pingdotgg/t3code/apps/desktop/src/backend/DesktopBackendPool.ts@0bb6eaa546c9`, `pingdotgg/t3code/apps/desktop/src/wsl/DesktopWslBackend.ts@0bb6eaa546c9`.

## 3. Persistence

- **SQLite, through Node's built-in `node:sqlite`.** There is no embedded Postgres and no `better-sqlite3`, so nothing native has to be rebuilt per Electron ABI. A custom Effect SQL client wraps it, with a reader worker thread and a checkpoint worker thread.
  `pingdotgg/t3code/packages/shared/src/nodeSqliteClient.ts@0bb6eaa546c9` (`import * as NodeSqlite from "node:sqlite"`), `pingdotgg/t3code/apps/server/src/persistence/Sqlite.ts@0bb6eaa546c9`.
- **Pragmas:** WAL, `synchronous=NORMAL`, `checkpoint_fullfsync=ON` (macOS), `busy_timeout=5000` (the CLI and server write from separate processes), `auto_vacuum=INCREMENTAL` on new databases, `journal_size_limit=128MB`, `temp_store=MEMORY`. A damaged database (SQLITE_CORRUPT or NOTADB) gets a human-readable recovery message.
  `pingdotgg/t3code/apps/server/src/persistence/Sqlite.ts@0bb6eaa546c9` (L16–118).
- **Location:** `~/.t3/userdata/statev2.sqlite` (`~/.t3/dev/` in dev), overridable with `T3CODE_HOME`. Attachments, logs, settings, keybindings and themes live alongside it, and caches sit in `~/.t3/caches`. Electron `userData` (Chromium profile) is separate (`~/Library/Application Support/...`).
  `pingdotgg/t3code/apps/desktop/src/app/DesktopStatePaths.ts@0bb6eaa546c9`, `pingdotgg/t3code/apps/server/src/config.ts@0bb6eaa546c9` (L144–160).
- **Migrations run automatically at server start, in code.** The runner is Effect's `Migrator.fromRecord` with numbered TypeScript migrations (`001_…` to `087_…` plus an `OrchestrationV2/` set, about 110 files) and an `effect_sql_migrations` ledger. Properties:
  - one transaction per migration, so an interrupted upgrade resumes at the last finished one;
  - on an existing database the migrations run on a **worker connection**, so index builds don't block the event loop (the HTTP listener answers 503 meanwhile);
  - progress lines (`n of m`) feed the desktop's readiness extension;
  - the ledger is validated against the build's manifest, and a row "unknown to this build" (a downgrade) or a name mismatch fails loudly;
  - a CLI process may migrate only while holding the ownership lock, never behind a running server.
    `pingdotgg/t3code/apps/server/src/persistence/Migrations.ts@0bb6eaa546c9` (L193–330), `pingdotgg/t3code/apps/server/src/persistence/Sqlite.ts@0bb6eaa546c9` (L55–84, `runMigrationsAsOwner`, `runMigrationsOffMainThread`).
- There is **no pre-migration backup** step in the runner. Recovery after a failed start is "update / reinstall last-started version / releases page". `pingdotgg/t3code/apps/desktop/src/app/DesktopStartupRecovery.ts@0bb6eaa546c9` (`resolveStartupRecoveryOffer`, `desktop-last-started-version`).

## 4. Queues, background jobs, pub/sub: what replaces Redis

There is **no Redis and no external broker.** I read every grep hit for redis, bullmq and ioredis: all are UI strings or test fixtures. Everything runs in-process on Effect primitives, made durable through SQLite:

- **Pub/sub:** in-memory `PubSub`, unbounded or sliding, one per concern (orchestration live events, settings, keybindings, PR state, provider registry). Fan-out to clients goes over the server's WebSocket (`ws.ts`).
  `pingdotgg/t3code/apps/server/src/orchestration-v2/EventSink.ts@0bb6eaa546c9` (L268–282), `pingdotgg/t3code/apps/server/src/pullRequest/PullRequestService.ts@0bb6eaa546c9` (L738–739), `pingdotgg/t3code/apps/server/src/ws.ts@0bb6eaa546c9`.
- **Durability:** events are event-sourced into SQLite first, with projections and command receipts. Side effects go through a **transactional outbox** table, then live events are published after the commit ("recorded before publication, so an interrupted publish cannot lose a committed outcome").
  `pingdotgg/t3code/apps/server/src/orchestration-v2/EffectOutbox.ts@0bb6eaa546c9`, `pingdotgg/t3code/apps/server/src/persistence/OrchestrationEventStore.ts@0bb6eaa546c9`.
- **Scheduling:** one in-process `Scheduler` ticks every 5 s. Each registered source runs under a 1-permit semaphore, so a source never overlaps itself. A "due hint" lets idle ticks skip SQL. Work is parked until startup recovery finishes.
  `pingdotgg/t3code/apps/server/src/scheduling/Scheduler.ts@0bb6eaa546c9`, `pingdotgg/t3code/apps/server/src/scheduling/DueHint.ts@0bb6eaa546c9`.
- **Scheduled tasks and webhooks** are rows in `scheduled_tasks` (`next_run_at`, run state, `releaseStuckRun`) with a webhook-delivery dedupe table. Polling SQL takes the place of BullMQ delayed jobs.
  `pingdotgg/t3code/apps/server/src/scheduledTasks/ScheduledTaskService.ts@0bb6eaa546c9` (L433–802).
- **Keep-awake and power-state policy** for long runs: `pingdotgg/t3code/apps/server/src/background/KeepAwake.ts@0bb6eaa546c9`, `pingdotgg/t3code/apps/server/src/background/BackgroundPolicy.ts@0bb6eaa546c9`.

## 5. Finding the user's tools from a GUI-launched app

- **The desktop owns shell-environment discovery and pushes the result to the backend.**
  1. It runs the user's login shell (`$SHELL`, then the passwd entry, then platform candidates) with `-ilc <capture command>`, capturing PATH plus about 20 vars (SSH_AUTH_SOCK, locale, mise/fnm deltas, DBUS/XDG…). The timeout is 5 s, retried once at 20 s for slow boot-time profiles.
  2. If no shell answers on macOS, it falls back to `launchctl getenv PATH` (2 s).
  3. The result is merged with the inherited PATH.
  4. Windows uses `pwsh`/`powershell` with and without the profile.
     `pingdotgg/t3code/apps/desktop/src/shell/DesktopShellEnvironment.ts@0bb6eaa546c9` (L89–123, L348–370, L448–500).
- **Cached for fast start:** `<stateDir>/shell-environment-cache.json` (mode 0600, atomic tmp+rename), keyed on the inherited baseline and SHELL. The backend starts at once with `T3CODE_DESKTOP_SHELL_DISCOVERY_PENDING=1` and receives the fresh environment over fd4 when discovery finishes, at which point the server clears the flag. Telemetry stays off until real discovery completes, because "a cached PATH does not establish consent".
  Same file L604–690; `pingdotgg/t3code/apps/server/src/resourceTelemetry/DesktopTelemetryReceiver.ts@0bb6eaa546c9` (L271); `pingdotgg/t3code/apps/server/src/telemetry/AnalyticsService.ts@0bb6eaa546c9` (L121–143).
- **Executable resolution** happens per spawn, with a PATH-keyed cache. Misses are _not_ cached, so an agent shows up the moment it is installed. On macOS, `git` resolving to the `/usr/bin/git` xcode-select shim is swapped for the real Xcode git when one exists. Windows handles `.cmd`/`.bat` shims and prefers Git for Windows. Agent CLIs take a configurable `binaryPath` per provider (for example `codex app-server`); Claude goes through `@anthropic-ai/claude-agent-sdk`.
  `pingdotgg/t3code/packages/shared/src/shell.ts@0bb6eaa546c9` (L806–940, `resolveSpawnCommand`, `resolveMacosGit`), `pingdotgg/t3code/apps/server/src/provider/CodexProvider.ts@0bb6eaa546c9` (L626–966).
- **Reverse direction:** the app installs a `t3` CLI shim on first launch, after shell discovery. The shim embeds the install's home and exec path so `sudo` works. `pingdotgg/t3code/apps/desktop/src/app/DesktopCliShim.ts@0bb6eaa546c9`, `pingdotgg/t3code/apps/desktop/src/app/DesktopApp.ts@0bb6eaa546c9` (`installOnFirstLaunch`).
- **macOS TCC:** agents inherit the app's identity, so the entitlements claim camera and microphone, and Info.plist carries usage strings for calendars, local network and screen capture "for commands run by terminals and coding agents". `pingdotgg/t3code/scripts/build-desktop-artifact.ts@0bb6eaa546c9` (L1385–1405, L2830–2860).

## 6. Packaging, signing, update, first run

- **Per-arch builds, not universal.** The build script supports `universal` (lipo), but the release runs six jobs: mac arm64/x64 on macOS-26 runners, linux x64/arm64, and win x64/arm64 built on Linux and verified on real Windows runners. A **universal build is never published.**
  `pingdotgg/t3code/.github/workflows/release.yml@0bb6eaa546c9` (L632–790), `pingdotgg/t3code/scripts/build-desktop-artifact.ts@0bb6eaa546c9` (L69, L145, L1017).
- **Targets:** mac `dmg` + `zip` (the zip feeds the updater), linux `AppImage` + `deb` (static AppImage runtime, so FUSE 3-only hosts work), win `nsis` with differential packages. The same script also builds standalone **CLI archives** (`t3-<ver>-<os>-<arch>.tar.gz/.zip`) via Node SEA, which "must run without host Node, npm, or compilers".
  `pingdotgg/t3code/scripts/build-desktop-artifact.ts@0bb6eaa546c9` (L2825–2975), `pingdotgg/t3code/scripts/build-cli-archive.ts@0bb6eaa546c9`.
- **Native payload:** node-pty, `@ff-labs/fff-node`, transcribe-cpp dylibs (asarUnpack), ffi-rs, and a Rust `t3-resource-monitor` sidecar. On Windows the server goes in a separate `server.asar` with physically hoisted dependencies, because asar cannot hold pnpm symlinks. `pingdotgg/t3code/scripts/build-desktop-artifact.ts@0bb6eaa546c9` (L2801–2802, L3137–3168), `pingdotgg/t3code/.github/workflows/release-desktop.yml@0bb6eaa546c9` (resource monitor collect step).
- **macOS signing and notarization:** `@electron/osx-sign` with batched codesign, hardened-runtime entitlements (`allow-jit`, `allow-unsigned-executable-memory`, `disable-library-validation`, camera and mic), an optional provisioning profile for passkeys and keychain groups, and notarization through an App Store Connect API key (`APPLE_API_KEY/_ID/_ISSUER`). The CLI archive is notarized on a deferred path.
  `pingdotgg/t3code/scripts/sign-macos.ts@0bb6eaa546c9`, `pingdotgg/t3code/scripts/build-desktop-artifact.ts@0bb6eaa546c9` (L1259–1405), `pingdotgg/t3code/.github/workflows/release-desktop.yml@0bb6eaa546c9` (L439–468, L578–680).
- **Windows signing:** **Azure Trusted Signing**, natively on win32 or through `jsign` from Linux. `signExts: [".node", ".dll"]`, because Smart App Control checks unpacked natives. `pingdotgg/t3code/scripts/build-desktop-artifact.ts@0bb6eaa546c9` (L2952–2975).
- **Auto-update:** electron-updater against a **GitHub Releases** feed (`provider: github`, with `releaseType: prerelease` and `channel: nightly` for nightlies). Per-arch `latest-mac.yml` and `latest.yml` (win) manifests are merged into one file per channel by `merge-update-manifests.ts`. The app runs the first check 15 s after start, then polls every **4 h**, with `autoDownload=false` and `autoInstallOnAppQuit=false`, so the user explicitly downloads and installs. Differential download is disabled for an Intel build running under Rosetta. A managed policy can disable updates or the nightly channel, and SSH tunnels close before `quitAndInstall`.
  `pingdotgg/t3code/scripts/build-desktop-artifact.ts@0bb6eaa546c9` (L2700–2720, L2812–2821), `pingdotgg/t3code/scripts/merge-update-manifests.ts@0bb6eaa546c9`, `pingdotgg/t3code/apps/desktop/src/updates/DesktopUpdates.ts@0bb6eaa546c9` (L62–66, L935, L1208–1215).
- **First run:**
  1. The single-instance lock is taken.
  2. The home-owner check runs.
  3. The port scan picks a port.
  4. The backend is spawned: `~/.t3` is created and migrations run from zero on the main connection.
  5. The window opens once the backend is ready.
  6. Shell discovery runs in the background and installs the `t3` shim when it finishes.
     If startup fails, a recovery page offers update, reinstall of the last-started version, the releases page, copying logs, or quit. There is **no** "install Postgres or Docker" step, because there is nothing external to provision.
     `pingdotgg/t3code/apps/desktop/src/app/DesktopApp.ts@0bb6eaa546c9` (bootstrap L170–330), `pingdotgg/t3code/apps/desktop/src/app/DesktopStartupRecovery.ts@0bb6eaa546c9`.

### Release artifact sizes: v0.1.9 (`gh api repos/pingdotgg/t3code/releases/latest`)

| Platform  | Arch         | Artifact                            |       Bytes |    MB |
| --------- | ------------ | ----------------------------------- | ----------: | ----: |
| macOS     | arm64        | `T3-Code-0.1.9-arm64.dmg`           | 195,374,334 | 195.4 |
| macOS     | arm64        | `T3-Code-0.1.9-arm64.zip` (updater) | 187,924,587 | 187.9 |
| macOS     | x64          | `T3-Code-0.1.9-x64.dmg`             | 203,756,058 | 203.8 |
| macOS     | x64          | `T3-Code-0.1.9-x64.zip` (updater)   | 196,291,710 | 196.3 |
| Windows   | x64          | `T3-Code-0.1.9-x64.exe` (NSIS)      | 325,544,056 | 325.5 |
| Windows   | arm64        | `T3-Code-0.1.9-arm64.exe` (NSIS)    | 298,156,008 | 298.2 |
| Linux     | x64          | `T3-Code-0.1.9-x86_64.AppImage`     | 214,914,926 | 214.9 |
| Linux     | x64          | `T3-Code-0.1.9-amd64.deb`           | 175,486,892 | 175.5 |
| Linux     | arm64        | `T3-Code-0.1.9-arm64.AppImage`      | 206,857,727 | 206.9 |
| Linux     | arm64        | `T3-Code-0.1.9-arm64.deb`           | 163,889,440 | 163.9 |
| CLI (SEA) | darwin-arm64 | `t3-0.1.9-darwin-arm64.tar.gz`      | 114,871,581 | 114.9 |
| CLI (SEA) | linux-x64    | `t3-0.1.9-linux-x64.tar.gz`         | 149,119,656 | 149.1 |
| CLI (SEA) | linux-arm64  | `t3-0.1.9-linux-arm64.tar.gz`       | 140,086,303 | 140.1 |
| CLI (SEA) | win32-x64    | `t3-0.1.9-win32-x64.zip`            | 134,015,348 | 134.0 |
| CLI (SEA) | win32-arm64  | `t3-0.1.9-win32-arm64.zip`          | 104,604,511 | 104.6 |

Also published: `.blockmap` files for the dmg, zip and exe (about 0.2–0.34 MB each); the `latest-mac.yml`, `latest.yml`, `latest-linux.yml` and `latest-linux-arm64.yml` feeds; `SHA256SUMS`; `builder-debug.yml`. There is no universal mac artifact and no darwin-x64 CLI archive in this release. The installers run about **190–215 MB** on mac and Linux and **300–325 MB** on Windows, with **SQLite only** and no database server. That is the baseline before OpenThrottle adds Postgres or Redis.

## What OpenThrottle should borrow / avoid

Context: `applications/openthrottle-app` today forks a `utilityProcess` that serves the React Router build and proxies `/graphql` to an external NestJS + Postgres (pgvector, pg_trgm) + Redis (BullMQ) stack.

**Borrow**

1. **One server binary, two modes.** T3's desktop backend _is_ the standalone `t3` server with `mode: "desktop"`. Bundle `openthrottle-server` the same way: one artifact, also shippable as a headless service and CLI.
2. **Bootstrap over an fd, with a per-launch token and secret.** This keeps secrets out of argv and env. It also gives a channel for pushing later updates (shell env, certs) into a running server, which matters because OT's `.env` token wiping is a known pain point.
3. **A data-dir ownership lock that the OS releases on SIGKILL** (an exclusive SQLite transaction, or an equivalent `flock`), checked by the desktop before spawning. It stops the app and a dev `openthrottle-server:dev` from fighting over the same data.
4. **The supervision recipe:** readiness on a well-known HTTP path, a readiness budget extended while migrations report progress, 500 ms→10 s exponential restart with "show failure after 3", and SIGTERM→5 s→SIGKILL with a quit budget. Add the Linux `/proc` orphan sweep if OT spawns agent CLIs.
5. **Login-shell PATH discovery owned by the desktop, cached, and pushed live.** Agent CLIs (claude, codex, cursor) and git must resolve from a Finder-launched app. Copy the `-ilc` probe, the `launchctl` fallback, the cache file, uncached misses, and the swap of the xcode-select git shim.
6. **Migrations at server start with a ledger, one transaction per migration, and a refusal to run against an unknown (newer) ledger row.** OT's `schema_migrations` ledger already fits this, so wire it into the bundled server's boot, as `monorepo:ensure-migrations` does in dev.
7. **Release mechanics:** per-arch mac dmg + zip, merged `latest-mac.yml`, electron-updater on GitHub Releases, manual download and install (`autoDownload=false`), a startup-recovery page offering "reinstall last-started version". Apple API-key notarization and Azure Trusted Signing are the low-friction signing paths, relevant to follow-up 333b0695.
8. **A custom privileged scheme for the renderer** instead of `file://` or an HTTP proxy, if OT moves to a client-rendered build.

**Avoid / think hard before copying**

1. **Assuming T3's footprint carries over.** T3 reaches 190–325 MB with _no_ database server. Adding a Postgres distribution with pgvector and pg_trgm per arch, plus Redis, adds substantial weight, signing surface (every Postgres binary and dylib must be codesigned and notarized), and an on-disk data-dir upgrade problem (`pg_upgrade` across majors) that T3 never has. Its SQLite + `node:sqlite` choice is what makes its first run zero-provisioning.
2. **Treating Redis/BullMQ as required.** T3 does all queues, scheduling and pub/sub in-process over a SQLite outbox and polling. For a single-user desktop install, a Postgres-backed queue (an outbox table or `SKIP LOCKED` polling, plus LISTEN/NOTIFY for pub/sub) would remove Redis from the bundle. That is a scoping question for the standalone-install plan.
3. **A loopback port without auth.** T3 always authenticates the local server with a desktop-minted token; OT's proxy should too.
4. **Universal mac builds.** T3 supports them in the script but ships per-arch. Native sidecars such as Postgres make universal builds larger and harder to sign.
5. **Silent auto-install.** T3 deliberately disables `autoInstallOnAppQuit`, because a migration on a large database can take minutes. OT should do the same, given its migration count.
6. **No backup before migrating.** T3 has no pre-migration backup. OT's Postgres migrations are less forgiving, so take a snapshot or dump before applying migrations from a new app version.
