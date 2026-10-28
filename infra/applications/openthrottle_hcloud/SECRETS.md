# Secret provisioning for the Hetzner path

Two things make this non-trivial:

1. **The rendered `.env` is incomplete on both provider paths.** A box built from either
   `startup.sh.tpl` today writes only Postgres, Redis and URL variables — and the server throws at
   boot without `JWT_SECRET`. Neither path has ever booted, so nobody has hit it.
2. **Hetzner `user_data` is not a secret store.** It is readable through the Hetzner API for the life
   of the server and lands in plaintext on disk. So "add the secrets as Terraform variables and
   interpolate them into cloud-init" is not an acceptable answer.

## What the code actually requires

Audited from the source rather than from `.env.default`, because the two disagree.

| Variable                                                         | Hard requirement?                      | Evidence                                                   |
| ---------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| `JWT_SECRET`                                                     | **YES — throws at boot**, min 32 bytes | `packages/nestjs-auth/src/strategies/jwt.strategy.ts`      |
| `POSTGRES_PASSWORD`                                              | YES — Postgres will not initialize     | `postgres` container                                       |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PORT` | YES, not secret                        | rendered from Terraform variables                          |
| `REDIS_HOST`, `REDIS_PORT`                                       | YES, not secret                        | `applications/openthrottle-server/src`                     |
| `BULLMQ_BOARD_ADMIN_USERNAME` / `_PASSWORD`                      | **NO — not in production**             | `isBullBoardEnabled()` returns `NODE_ENV !== 'production'` |
| `OPENTHROTTLE_MCP_AUTH_TOKEN`                                    | No at server boot; **yes for `mcp`**   | `bootstrap.ts` logs "Skip … not set" rather than throwing  |
| `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN`                         | No — same skip path                    | `bootstrap.ts` `BOOTSTRAP_ACCOUNTS`                        |
| `OPENTHROTTLE_BOOTSTRAP_USER_*`                                  | No — has defaults                      | `bootstrap.ts`                                             |

### Three corrections this audit produced

**`BULLMQ_BOARD_ADMIN_*` is _not_ required in production.** The plan lists it as boot-required, but
`isBullBoardEnabled()` is `NODE_ENV !== 'production'`, and the module's own doc comment says the
dashboard "is internet-reachable and guarded only by a single shared static basic-auth credential, so
it must stay off in production." With `NODE_ENV=production` the Joi schema demanding a 16-character
password never runs. So these are not merely unnecessary here — setting them up would mean turning on
something the code deliberately keeps off. **Do not provision them.**

**`.env` must contain `JWT_SECRET` under that exact name.** `.env.default` defines only
`OPENTHROTTLE_DEVELOPER_JWT_SECRET`; the root `docker-compose.yml` bridges them with
`JWT_SECRET: ${OPENTHROTTLE_DEVELOPER_JWT_SECRET}`. The rendered compose here uses a plain
`env_file: .env` with no such mapping, so **writing only the prefixed name would leave the server
throwing at boot.** Write `JWT_SECRET` directly.

**The default JWT secret is exactly 32 bytes** — `"OpenThrottle_2026_default_secret"` passes the
`JWT_SECRET_MIN_BYTES = 32` check with zero margin, and it is a published value in a public
repository. It must never reach a deployment.

## The mechanism: generate on the box, provision the rest out of band

Secrets are split by **who needs to know them**, which turns out to eliminate almost all of the
problem.

### 1. Self-generated at first boot — never in Terraform, state, or `user_data`

`JWT_SECRET` and `POSTGRES_PASSWORD` have no external consumer at rung 0. Nothing outside the box
needs to know them; they only need to be strong and _stable across restarts_. So cloud-init generates
them once with `openssl rand`, writes them to a root-only `0600` file, and reuses that file on every
subsequent boot.

The consequences are all good ones:

- They never appear in `user_data`, so the Hetzner API never exposes them.
- They never enter Terraform state, so the state file stops being a secret-bearing artifact.
- Nobody has to rotate a secret that was accidentally committed, because it was never written down.

Generation must be **idempotent** — read the existing file if present, generate only if absent.
Regenerating `POSTGRES_PASSWORD` on a reboot would lock the server out of its own database, and
regenerating `JWT_SECRET` would invalidate every issued session.

The corresponding Terraform variables (`jwt_secret`, `postgres_password`) default to `""`, meaning
_generate on the box_. Supplying a value is supported and is required for ladder rung 2, where
Postgres moves off-box and something else has to know the password — at which point it stops being a
box-local secret and needs real handling.

### 2. Supplied at apply time — the registry credential

Pulling images happens before anything else can run, so this one cannot be deferred.

**It should not be needed at all.** GHCR packages for a public repository can be public, and the
OpenThrottle repository is public. With public packages `docker pull` needs no authentication and
`ghcr_username` / `ghcr_token` stay empty — **zero secrets in `user_data`**. That is the recommended
configuration, and it is the reason this section is short.

If the packages are kept private, a scoped `read:packages` token is the single unavoidable `user_data`
secret. Accept the exposure knowingly: use a token with no other scope, and rotate it if the server
is ever shared or snapshotted.

### 3. Provisioned out of band — the manual bootstrap step

`OPENTHROTTLE_MCP_AUTH_TOKEN`, `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` and
`OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD` are exactly what `docker compose run --rm bootstrap` exists to
install — and that step is deliberately manual, run over SSH after the first successful `up`.

That timing is the whole trick: an operator can pass these in the environment of that one invocation,
so they reach the database without ever touching `user_data` or Terraform.

```bash
# On the box, after the first successful `up`.
OPENTHROTTLE_MCP_AUTH_TOKEN='ot_sa_…' \
OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD='…' \
  docker compose run --rm bootstrap
```

`bootstrap` logs `Skip <account>: <VAR> not set` rather than throwing when a token is absent, so the
step is safe to run before you have decided on every token, and safe to re-run later — it is
idempotent.

Until it has run there is **no login user and no MCP token**, so the `mcp` container will not serve.
That is intended: `up` must never silently provision a possibly-shared database.

### 4. Held by CI, never by the box — the automated deploy's credentials

`.github/workflows/hetzner-deploy.yml` needs an SSH key, the box's host key, and `HCLOUD_TOKEN`,
a Hetzner API token it uses to open the deploy firewall to its runner's IP for the length of a run.
It is the same name the Terraform provider reads, and may be the same token: a separate one would
not be narrower, since every read/write token reaches the whole project. What a separate token buys
is only independent revocation. All of them live in GitHub Actions secrets; none is written to the box,
`user_data`, or Terraform state.

**The API token is the most powerful credential in this setup.** Hetzner cannot scope a token below
a project, so a read/write token for opening one firewall can also delete the server and its volume.
Keep the box in a Hetzner project of its own, so that token reaches nothing else, and rotate it if
the repository's Actions secrets are ever exposed.

## Agents on this box (`agents_enabled`)

Opt-in, off by default, and **a deliberate security trade**, so read this before setting
`agents_enabled = true`. It runs the agent CLIs (claude, codex, gemini) inside `openthrottle-server`
from the Dockerfile.NestJS `production-agents` image, so plans and chats can execute on the box.

### The accepted risk

The server spawns each CLI as a child process, so **there is no uid separation between the server and
the agents.** An agent turn, which means anything a model, or a prompt injected into a repository, can
make it do, can:

- read every server secret. `JWT_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `GITHUB_TOKEN` and the
  model API keys are all in the server's environment, and `/proc/1/environ` is readable by the same
  uid. The child's own environment is allowlisted; its parent's is not hidden from it.
- reach Postgres and Redis over the compose network, with the credentials it just read.
- use the GitHub PAT, and write anywhere under `/workspaces` and `/home/agent`.
- make arbitrary outbound connections. Nothing here restricts egress.

What still holds: the root filesystem is read-only, every capability is dropped, `no-new-privileges`
is set, and the container has no access to the host, the Docker socket or the other services'
volumes. Redis `requirepass` keeps a _different_ container, or anything that cannot read the server's
environment, out of Redis. It does **not** protect Redis from an agent.

That is acceptable for a **single-operator box** whose repositories and prompts you control, and not
for anything multi-tenant or any repository you do not trust. If a run looks hostile, rotate in this
order, all described under [Rotating a secret](#rotating-a-secret):

1. the GitHub PAT (revoke it on GitHub first), then the model API keys,
2. `JWT_SECRET`, the Postgres password and the Redis password,
3. then look at what it did: `git log` in the affected checkout under `/workspaces`, and the PAT's
   audit trail on GitHub.

### What `agents_enabled` changes

| Area           | Change                                                                                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image          | `openthrottle-server` and `bootstrap` run `server_agents_image` (the `sha-<sha>-agents` tag) instead of `server_image`.                                                                                         |
| Healthcheck    | Probes with `node` on `PATH` (the image is Debian), not `/nodejs/bin/node`.                                                                                                                                     |
| Writable paths | `/workspaces` and `/home/agent`, bind-mounted from the data volume (or the boot disk). `read_only: true` stays on.                                                                                              |
| `.env`         | Adds `OPENTHROTTLE_WORKSPACE_ROOTS=/workspaces`, `OPENTHROTTLE_CHECKOUT_ROOT=/workspaces/repositories`, `OPENTHROTTLE_WORKTREE_ROOT=/workspaces/worktrees` and `REDIS_PASSWORD`.                                |
| `HOME`         | `/home/agent`, set on the server service only. Not in `.env`: that file is also the systemd `EnvironmentFile` for the host-side nightly backup, and a `HOME` of `/home/agent` there would hide rclone's config. |
| Redis          | `requirepass` from a `REDIS_PASSWORD` generated on the box (same idempotent mechanism as `JWT_SECRET`), and an authenticated healthcheck.                                                                       |
| Memory         | `agents_server_mem_limit` (default `1280m`) instead of `640m`. Plan on `server_type = "cx33"`: see `infra/hetzner-topology.md`.                                                                                 |
| Credentials    | An optional, operator-written `agent-secrets.env` is loaded by `openthrottle-server` only.                                                                                                                      |

Only the server talks to Redis (BullMQ, the Apollo cache, the health ping and the plan-cancel channel
all read `REDIS_PASSWORD` through the `REDIS_*` variables), so no other service needs the password
beyond the shared `.env`.

### Creating the GitHub token

Use a **fine-grained personal access token**, never a classic one:

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** →
   Generate new token.
2. **Resource owner**: the user or organisation that owns the repositories. An organisation may
   require an owner to approve the token.
3. **Repository access**: _Only select repositories_, and pick exactly the ones OpenThrottle should
   work on. Not _All repositories_.
4. **Repository permissions**: _Contents_ **Read and write**, _Pull requests_ **Read and write**,
   _Metadata_ **Read-only** (GitHub adds this one itself). Nothing else.
5. Set the shortest expiry you are willing to rotate (30–90 days) and put it in your calendar. An
   expired token fails quietly: a `gh auth login failed` warning in the server log, then `git push`
   errors inside agent turns.

### `agent-secrets.env`

A root-owned `0600` file **next to the compose file** (`/opt/openthrottle/agent-secrets.env`), written
over SSH. It is never in `user_data`, never in Terraform state, and not created by `startup.sh`.
Compose loads it as a second `env_file` on `openthrottle-server` only, marked `required: false`, so a
box without it still boots; the agents then simply have no credentials.

```bash
ssh root@"$(terraform output -raw ipv4_address)"
cd /opt/openthrottle

# Heredoc input is not recorded in shell history. Omit any line you do not use.
(umask 077 && cat > agent-secrets.env <<'EOF'
GITHUB_TOKEN=github_pat_REPLACE_ME
OT_GIT_USER_NAME=Your Name
OT_GIT_USER_EMAIL=you@example.com
ANTHROPIC_API_KEY=sk-ant-REPLACE_ME
OPENAI_API_KEY=sk-REPLACE_ME
GEMINI_API_KEY=REPLACE_ME
EOF
)
chown root:root agent-secrets.env && chmod 0600 agent-secrets.env
ls -l agent-secrets.env        # -rw------- 1 root root

docker compose up -d --force-recreate openthrottle-server
```

- One `KEY=value` per line, no `export`, no quotes needed, no trailing spaces.
- `GITHUB_TOKEN` is consumed by the image's entrypoint, which pipes it to `gh auth login` and runs
  `gh auth setup-git`, writing the credential under `/home/agent` (the volume). `OT_GIT_USER_NAME` and
  `OT_GIT_USER_EMAIL` become `git config --global user.name` / `user.email` there. Agent children
  inherit `HOME` but not `GITHUB_TOKEN`, so the credential lives in the volume rather than in their
  environment.
- The three API keys reach the CLIs through the server's environment. Also supported, if you prefer a
  subscription to a metered key: `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) and
  `CODEX_API_KEY`.
- **Docker Compose >= 2.24.0 is required.** The long-form `env_file` with `required: false` is
  rejected as an unknown property on older versions, and then _every_ `docker compose` command on the
  box fails, not only this service. Check `docker compose version` before enabling. The Docker apt
  repository `startup.sh` installs from ships a newer one.
- `startup.sh` re-asserts `root:root` / `0600` on the file whenever it exists, and logs when it does
  not.

Check it took effect:

```bash
docker compose exec -T openthrottle-server sh -c \
  'gh auth status; git config --global user.name; git config --global user.email'
```

### Rotating a secret

Each ends with a recreate so the container re-reads its environment. For the values `startup.sh`
manages, edit `/opt/openthrottle/.secrets` and re-run the script: it rewrites `.env` from that file
and never regenerates a value that is present.

| Secret                                                                                              | Procedure                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`                                                                                      | Create the new PAT, edit `agent-secrets.env`, `docker compose up -d --force-recreate openthrottle-server`, **then** revoke the old one on GitHub. If `gh auth status` still shows the old token, delete `<agent-home>/.config/gh/hosts.yml` and recreate again. |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`, `CODEX_API_KEY` | Edit `agent-secrets.env`, `docker compose up -d --force-recreate openthrottle-server`. Revoke the old key at the provider.                                                                                                                                      |
| `OT_GIT_USER_NAME`, `OT_GIT_USER_EMAIL`                                                             | Edit `agent-secrets.env`, recreate `openthrottle-server`. The entrypoint rewrites the global git config.                                                                                                                                                        |
| `JWT_SECRET`                                                                                        | Put a new `JWT_SECRET=$(openssl rand -hex 32)` value in `.secrets`, re-run the startup script, `docker compose up -d --force-recreate`. Every issued session stops validating.                                                                                  |
| `POSTGRES_PASSWORD`                                                                                 | Change it **in the database first** (it is only read at `initdb`, so editing the file alone locks the server out), then in `.secrets`, then recreate. Procedure below.                                                                                          |
| `REDIS_PASSWORD`                                                                                    | Delete the `REDIS_PASSWORD=` line from `.secrets` (or set a new value), re-run the startup script, `docker compose up -d --force-recreate redis openthrottle-server`. Recreate both together: Redis takes the password at start.                                |

`<agent-home>` is `/mnt/openthrottle-data/agent-home` with a data volume, otherwise
`/opt/openthrottle/agent-home`.

Rotating the Postgres password:

```bash
cd /opt/openthrottle
NEW="$(openssl rand -hex 24)"
set -a; . ./.env; set +a
docker compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v new="${NEW}" \
  <<< "ALTER USER ${POSTGRES_USER} PASSWORD :'new';"
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${NEW}/" .secrets
bash /usr/local/sbin/openthrottle-startup.sh   # rewrites .env, recreates what changed
```

Expect a short outage while the server reconnects. If a step fails between the `ALTER` and the `sed`,
the database and `.secrets` disagree: fix whichever is wrong before restarting anything.

### Bumping the agent CLI versions

The CLIs are not downloaded on the box. They are pinned in `docker/agent-clis/package.json` and
`package-lock.json`, installed at image build time, and the image sets `DISABLE_AUTOUPDATER`.

1. Dependabot (the npm entry for `/docker/agent-clis` in `.github/dependabot.yml`) opens a PR that
   bumps the pins and the lockfile.
2. Merging it runs `openthrottle-docker.yml`, which boot-checks and publishes a new
   `openthrottle-server:sha-<sha>-agents`.
3. Point the environment at it: change `server_agents_image` (same sha as `migrations_image`), then
   roll it out. Because `user_data` is in `ignore_changes`, the variable alone does **not** reach a
   running box. Use `.github/workflows/hetzner-deploy.yml` (it retags the compose file and keeps the
   `-agents` suffix), or the render-and-re-run path in
   [`README.md`](./README.md#rolling-a-change-out-to-an-existing-box).

## Would this also serve the GCP path?

Partly, and it is worth being precise, since the contract is better off with one row for secrets than
two.

- **Generate-on-box (§1) ports directly.** It is plain cloud-init shell, and GCP's
  `metadata_startup_script` runs the same way. Adopting it there would remove `postgres_password` from
  plaintext metadata — except that Cloud SQL is a managed service whose password Terraform must know
  to create the instance. So GCP can adopt the pattern for `JWT_SECRET` but **not** for
  `POSTGRES_PASSWORD`.
- **Out-of-band bootstrap (§3) ports directly.** Nothing about it is Hetzner-specific.
- **The registry credential differs by construction** — `gcloud auth configure-docker` uses the
  instance's service account, so GCP needs no token in metadata at all. That is genuinely nicer, and
  the honest comparison: GCP's registry auth is better, Hetzner's database password handling is
  better.

**An external secret store would collapse the row to one spelling** and is the right long-term answer
if the secret set grows, or as soon as rung 2 means `POSTGRES_PASSWORD` must be known by two machines.
It is not justified at rung 0, where §1 and §3 between them leave nothing that needs storing.

## Known defect on the GCP path

`applications/openthrottle_gcp/templates/startup.sh.tpl` interpolates `postgres_password` straight into
`metadata_startup_script`, readable by anyone with instance-get on the project, and writes no
`JWT_SECRET` at all — so a GCP box built from it would not boot either.

Recorded in [`infra/provider-contract.md`](../../provider-contract.md); fixing it is a follow-up, not
this plan. Stated here so "both providers are supported" stays an honest claim.
