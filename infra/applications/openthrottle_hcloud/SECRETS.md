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

`applications/openthrottle/templates/startup.sh.tpl` interpolates `postgres_password` straight into
`metadata_startup_script`, readable by anyone with instance-get on the project, and writes no
`JWT_SECRET` at all — so a GCP box built from it would not boot either.

Recorded in [`infra/provider-contract.md`](../../provider-contract.md); fixing it is a follow-up, not
this plan. Stated here so "both providers are supported" stays an honest claim.
