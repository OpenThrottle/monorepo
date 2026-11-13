# Option: the desktop app drives `applications/openthrottle/docker-compose.yml`

Comparison baseline, not the favourite. Measured 2026-11-12 on an Apple Silicon Mac, Docker Desktop 29.7.2
(VM: 5 CPUs, 15.6 GiB), compose v5.3.1, link to Docker Hub of about 11.5 MB/s (one blob fetched with curl).

## How "clean" was achieved

Every image was already on the host, and the host's credential helper (`docker-credential-desktop`) hung on
every `docker pull` (40 s timeout, `signal: terminated`). So the cold run used a **fresh `docker:dind`
daemon inside Docker Desktop's VM**: no images, no volumes, no build cache. It pulled anonymously and ran
the repo's compose file unchanged, with a throwaway `.env` (random Postgres password and JWT, ports 75xx),
project `-p ot-spike-task5`. That is a real clean pull and first boot on the same VM. It is not a fresh
Docker Desktop install: the time to install Docker Desktop and boot its VM is not measured. Afterwards the
dind container, its volume and `docker:dind` were removed. The host image and volume lists match the
lists taken before the run.

## Numbers

| What                                                                                                                          | Measured                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compressed pull, linux/arm64 (summed from the registry manifests)                                                             | server 382 MB, developer 389 MB, migrations 82 MB, redis:8.8-alpine 38 MB, pgvector base for postgres 162 MB: **about 1.05 GB**                                                                                                           |
| Unpacked on disk                                                                                                              | developer 1.52 GB and migrations 252 MB (host `image inspect`, same digests). Fresh daemon (containerd snapshotter, compressed copies included): images 5.7 GB, plus 0.67 GB build cache from the postgres build                          |
| **Cold first start** (`compose up -d` until the server is healthy, including pull, postgres build, DB init and 89 migrations) | **118 s** (about 90 s of that is download at 11.5 MB/s, an estimate)                                                                                                                                                                      |
| `bootstrap` one-shot (seeds the login user)                                                                                   | 2 s                                                                                                                                                                                                                                       |
| **Warm restart** (`stop`, then `up -d`)                                                                                       | API `/health` returns 200 at **14 s**, developer serves HTTP at **20 s**                                                                                                                                                                  |
| Idle memory of the stack                                                                                                      | server 378–452 MiB, developer 120 MiB, postgres 30–35 MiB, redis 8–10 MiB: **about 540–620 MiB**                                                                                                                                          |
| Idle memory of Docker Desktop                                                                                                 | The VM reserves 15.6 GiB (a setting, not usage). Host RSS of the Docker processes is 5.0 GB, mostly `com.docker.sailor` (the VM), but that includes about 20 other containers running here, so a clean idle baseline **was not measured** |
| Published GHCR images (CI, linux/amd64 only)                                                                                  | server 180 MB, developer 192 MB, migrations 84 MB compressed                                                                                                                                                                              |

## Findings that block this option today

1. **The published images can't produce a working stack.** `openthrottle/postgres` and `openthrottle/mcp`
   are not on Docker Hub ("pull access denied"). Compose falls back to _building_ postgres from
   `Dockerfile.Postgres`, which only works because the app would ship that file. The `mcp` profile cannot
   start at all.
2. **Docker Hub `latest` is a manual push from 2026-08-06, linux/arm64 only.** It applies 89 migrations
   (the repo is past 150). Intel Macs, Windows and amd64 Linux get "no matching manifest". CI
   (`.github/workflows/openthrottle-docker.yml`) pushes only `sha-*` tags to GHCR and GAR, amd64 only, with
   no `latest` and no Docker Hub push.
3. **The login page returns 500 on that image.** `GET /` redirects to `/auth`, which returns 500 with
   `Error: APP_URL_EMAIL is not set`. The compose file never passes `APP_URL_EMAIL` to `developer`.
4. **Startup has a 30 s floor.** The server's in-image healthcheck runs every 30 s and has no
   `start_interval`, and `developer` waits for `service_healthy`. A short `start_interval` would remove most
   of that wait.

## What the Electron main process must do

**Detect** (in this order; behaviour observed here except where noted):

- **Not installed:** no `docker` on PATH (GUI apps get a minimal PATH, so also check
  `/usr/local/bin/docker` and `/Applications/Docker.app`), and no socket at `~/.docker/run/docker.sock`
  or `/var/run/docker.sock`. → Show "Install Docker Desktop" with a link.
- **Installed but stopped:**
  - With no socket file, the CLI prints `failed to connect to the docker API at unix://…: connect: no such
file or directory` and exits 1.
  - With a stale socket file, it prints `Cannot connect to the Docker daemon at unix://…. Is the docker
daemon running?` and exits 1.
  - Probe without the CLI: an HTTP `GET /_ping` over the socket returns `OK` when Docker is up.
  - → Run `open -a Docker`, then poll `/_ping` with a timeout (about 60 s) and show a spinner. Do not try to
    install or start the VM silently.
  - Docker Desktop was not stopped to observe this state live; the messages come from a missing socket and
    a stale socket created for the test.
- **Running but unusable:** the credential helper or Keychain hangs (observed: pulls blocked indefinitely),
  the user has picked another context (`docker context ls` showed `default` and `desktop-linux`), or the VM
  is out of disk. → Put a timeout on every CLI call, and use a private `DOCKER_CONFIG` without `credsStore`
  for anonymous pulls (that is what made the pulls here work).

**Ports and volumes mapped to `userData`:**

- Generate `.env` into `app.getPath('userData')/stack/.env` with random secrets. Copy the compose file and
  `Dockerfile.Postgres` from the app bundle next to it.
- Pick free host ports at first run and persist them. The defaults 9010/9011/9020/9021 collide with
  anything else on the machine.
- Use a fixed project name (`-p openthrottle-app`).
- Postgres data must stay a **named volume**. A bind mount into `userData` would put it on the macOS
  host's virtiofs, which is slow for Postgres and has permission problems. As a result, the data lives
  inside Docker's VM, not in `userData`: an uninstall leaves it behind, and "Reset Docker" deletes it.
- `OPENTHROTTLE_WORKSPACES_DIR` is a bind mount and needs Docker Desktop file-sharing for that path.

**Upgrades:**

- On an app update, set `APP_VERSION` to the app's own version, then run `compose pull` and `up -d`. The
  `migrations` one-shot is run-once and idempotent; then run `bootstrap`, which is also idempotent.
- This requires per-release tags, multi-arch, on a public registry. None exist today (see Findings 1–2).
- There is no rollback for a migration that has already run. Back up first with `pg_dump` through
  `compose exec`.

## Failure modes

- Docker not installed. Or installed but stopped, or slow to boot (VM start adds tens of seconds; not
  measured).
- Credential helper or Keychain hangs, so `docker pull` blocks forever. This was observed here.
- Wrong `docker context`, or another engine (Colima, OrbStack, Rancher) with a different socket path.
- Host port taken by another project. This was seen here: several stacks run on 6010 and 74xx.
- The image does not exist (postgres, mcp) or lacks the user's architecture (amd64 users today).
- The stale `latest` image breaks the login page (APP_URL_EMAIL).
- No disk space in the VM: the stack needs about 6 GB unpacked, and this machine already had 59 GB of
  images and 45 GB of build cache.
- First pull is about 1 GB, so it fails or is painful offline, behind a corporate proxy or registry
  mirror, or under Docker Hub's anonymous pull rate limits.
- "Clean / Purge data" or "Reset to factory defaults" in Docker Desktop silently wipes the user's
  OpenThrottle database.
- A user's own `docker compose down -v` or `docker system prune --volumes` does the same.
- Docker Desktop upgrades or VM restarts kill the stack mid-run. `restart: always` brings it back but
  drops in-flight BullMQ jobs.
- Licensing: Docker Desktop is free only for personal use, education, non-commercial open source and
  companies with **fewer than 250 employees and under $10M revenue**. Anyone else needs a Pro, Team or
  Business subscription (https://docs.docker.com/subscription/desktop-license/). The app cannot satisfy or
  check this for the user.

## Who it suits, who it fails

**Suits** developers who already run Docker Desktop daily, with spare RAM and disk, at an individual or
small company. For them the extra cost is about 0.6 GiB RSS, about 1 GB of download and a two-minute
first boot, and the stack is the same one used for self-hosting. It is also the cheapest option for us to
build, _once_ releases are tagged and multi-arch.

**Fails** anyone without Docker: the app's whole promise becomes "first install a 2 GB+ VM product and
accept its licence". It also fails employees at companies over the licence threshold or with Docker banned
or locked down, Intel and Windows users today (no amd64 `latest`), and people offline or behind restrictive
proxies. It fails anyone who expects the data to live with the app: it lives in Docker's VM, and a Docker
reset wipes it.

## Not measured

- A fresh Docker Desktop install and the VM's first boot.
- A clean-machine idle baseline for Docker Desktop.
- The amd64 path end to end, and the size of the GHCR `mcp` image.
- An upgrade from one tagged release to the next: no tagged releases exist.
