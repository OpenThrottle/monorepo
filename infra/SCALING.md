# Scaling runbook

Exact commands for each rung of the ladder in [hetzner-topology.md](./hetzner-topology.md). Rungs 0–3
scale within Hetzner; rung 4 changes provider.

Run everything from `infra/environments/production-hcloud` unless stated otherwise, with
`HCLOUD_TOKEN` exported.

**Before any rung: take a backup.** Every rung below either restarts Postgres or moves its data.

```bash
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" 'cd /opt/openthrottle && systemctl start openthrottle-backup.service'
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" 'ls -la /var/backups/openthrottle'
```

## Rung 1 — a bigger box

Change one variable:

```hcl
# environments/production-hcloud/openthrottle.tf
server_type = "cx32" # was cx22
```

```bash
terraform plan   # expect: hcloud_server modified in place
terraform apply
```

### What the plan does not tell you

- **This is not a live resize.** Hetzner performs stop → resize → start. Terraform reports an
  in-place modification, which understates it: the box is powered off for the duration and the site
  is down. Schedule it.
- **`keep_disk` defaults to `true`** in `modules/hcloud_server`, deliberately against the provider's
  own default. Growing a Hetzner boot disk is **irreversible**, and once grown that server can never
  be downgraded to a cheaper type — the only way back is rebuilding onto a new server. Keeping the
  disk resizes CPU and RAM while preserving the option to scale back down.
- If you genuinely need a bigger **boot** disk, set `keep_disk = false` knowing it is a one-way door.
  Usually the right answer is a data volume instead (rung 2).

Expect CPU, not RAM, to be what forces this. The sizing note records that nominal CPU limits already
sum to 2.5 against 2 vCPU, so contention between the two Node processes arrives before any OOM.

## Rung 2a — grow the data volume

```hcl
data_volume_size_gb = 20 # was 10
```

```bash
terraform apply
# The filesystem does not grow with the volume; extend it on the box.
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" 'sudo resize2fs $(findmnt -no SOURCE /mnt/openthrottle-data)'
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" 'df -h /mnt/openthrottle-data'
```

Volumes are **grow-only**. That matters far less than the boot disk, since a volume grows in 10 GB
steps independently of the server and an over-sized one costs cents rather than blocking a downgrade.

Going from `0` to a volume for the first time is **not** just a variable change — it is a data
migration. `postgres_data_dir` moves from `/opt/openthrottle/postgres-data` to
`/mnt/openthrottle-data/postgres`, and cloud-init does not move existing data (and cannot: `user_data`
is in `ignore_changes`). Stop the stack, copy the directory, then start it:

```bash
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" 'cd /opt/openthrottle \
  && docker compose stop postgres \
  && sudo cp -a /opt/openthrottle/postgres-data/. /mnt/openthrottle-data/postgres/ \
  && docker compose up -d'
```

Then verify before deleting the old copy:

```bash
POSTGRES_HOST=… databases/verify-restore.sh
```

## Rung 2b — move Postgres off the box

**This is the rung the whole design protects, and it is genuinely a variable change.**

```hcl
postgres_host = "10.0.0.5" # a second Hetzner box, Neon, RDS, or Cloud SQL
postgres_port = 5432
```

```bash
terraform apply
```

No application change, no template change. It works because the server reads `POSTGRES_HOST` from
its environment and the compose service name is never baked into application config.

Two things to do first:

1. **Seed the new database** with [`databases/SEEDING.md`](../databases/SEEDING.md) — it is
   parameterised on `POSTGRES_HOST`/`POSTGRES_PORT` precisely so it works against any target.
2. **Check the connection model.** The server holds long-lived connections (TypeORM pool,
   graphql-ws subscriptions, BullMQ). A serverless pooler that assumes short-lived connections is not
   a drop-in.

Once Postgres is remote, `postgres_password` stops being a box-local secret. It can no longer be
generated on the box, so it has to be supplied — which is the point at which an external secret store
starts earning its keep. See [`applications/openthrottle_hcloud/SECRETS.md`](./applications/openthrottle_hcloud/SECRETS.md).

The on-box `postgres` container keeps running unless you also stop it. Leave it until the remote
database is verified, then remove it from the compose template.

### Variant: point back at GCP Cloud SQL

Same change, with the Cloud SQL private IP as `postgres_host`. Two caveats:

- Cloud SQL requires TLS when `postgres_ssl_mode = "ENCRYPTED_ONLY"`, and **the rendered `.env`
  writes no TLS parameters** — `sslmode` is not among the variables `startup.sh.tpl` emits. So this
  variant does not work today without adding that. Filed below.
- A Hetzner box reaching a Cloud SQL private IP needs connectivity into the VPC, which nothing here
  provisions.

## Rung 3 — split web and worker

Not implemented. The prerequisite is rung 2b: a split stack needs Postgres reachable from both boxes.

The shape it would take: instantiate `hcloud_server` twice from one application module, differing
only in which compose services each starts (the server already supports `PROCESS_ROLE`). Caddy stays
on the web box and proxies by hostname exactly as now.

What is missing is a way to render **different** compose files per box — the module renders one. That
is the actual work, and it is a module change rather than a variable change.

## Rung 4 — change provider

The plan's central claim is that an environment switches provider by changing which application
module it calls. **Written out honestly, that is true of the application and not true of the
environment.**

### What actually carries over

Measured from the two `variables.tf` files:

|                      | Count                      |                                                                                                                                                                            |
| -------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carry over untouched | **10**                     | `api_domain`, `caddy_image`, `deploy_enabled`, `developer_domain`, `developer_image`, `env_name`, `postgres_db_name`, `postgres_password`, `postgres_user`, `server_image` |
| Must be added        | **15** (4 with no default) | required: `network`, `project_id`, `region`, `zone`                                                                                                                        |
| Must be removed      | **23**                     | `server_type`, `location`, `ssh_*`, `backup_*`, `ghcr_*`, `postgres_host`/`_port`, the four on-box image variables, …                                                      |

So the edit is roughly 27 lines of variables, not one line of `source`. It is mechanical, and
`infra/tests/contract/check-provider-contract.sh` keeps the 10 honest — but calling it "a module
swap" oversells it.

### What is genuinely won

**The application needs no change at all.** It reads `POSTGRES_HOST`, `REDIS_HOST`, `JWT_SECRET` and
the rest from its environment on both paths, and the same `sha-<GITHUB_SHA>` image resolves on either
registry because images are built once and re-tagged. That is not a small thing: it is the difference
between changing configuration and porting an application.

### What does NOT follow the swap

1. **State.** The two paths are separate roots with separate state (`production-hcloud` has its own
   `prefix`). Editing `source` in one root would make Terraform **destroy every hcloud resource** —
   including the data volume — and create GCP ones. Never do that. Apply the other root instead.
2. **Data.** Nothing copies it. Dump and restore via
   [`databases/SEEDING.md`](../databases/SEEDING.md), then verify with `verify-restore.sh`.
3. **DNS.** Records must be repointed by hand. See
   [`applications/openthrottle_hcloud/CUTOVER.md`](./applications/openthrottle_hcloud/CUTOVER.md).
4. **Secrets.** `jwt_secret` is generated on the Hetzner box and stored only there. Migrating it
   means reading `/opt/openthrottle/.secrets` off the box — or accepting that every session is
   invalidated.
5. **The `mcp` service.** Absent from the GCP compose template. Swapping loses it.

### Blockers: cleared

Rung 4 was **not executable** when this runbook was first written, for five reasons — all defects on
the GCP path rather than gaps in the ladder. **All five are now fixed**, along with three more found
in the same audit: the rendered `.env` now carries `JWT_SECRET`, `NODE_ENV` and `POSTGRES_SSL`; the
Postgres password comes from Secret Manager instead of instance metadata; and the compose template
gained the `migrations`, `mcp` and `bootstrap` services it was missing. See
[provider-contract.md](./provider-contract.md) § "Defects fixed on the GCP path".

What that changes, precisely: a GCP box built from this module should now **boot**, apply migrations,
and serve. What it does not change is the list above — state, data, DNS and the box-generated JWT
secret still do not follow a provider swap, and those are inherent, not defects.

**The remaining caveat is exercise, not correctness.** Every fix was made by reading the code against
the working Hetzner path; the GCP composition has still never been applied. Treat the first real
apply as the first genuine test, and expect to find something.

The honest summary is therefore one step better than before: **the contract makes the application
portable, and the deployment is now plausibly portable — but unproven.**
