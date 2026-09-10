# Hosting options

`infra/` is a **suite of pre-configured hosting options for the same application**, not a single
stack. Two are supported today. An environment picks one by choosing which application module it
calls.

|                       | [`applications/openthrottle`](./applications/openthrottle/README.md) | [`applications/openthrottle_hcloud`](./applications/openthrottle_hcloud/README.md) |
| --------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Provider**          | Google Cloud Platform                                                | Hetzner Cloud                                                                      |
| **Compute**           | Compute Engine E2 (`e2-micro`)                                       | one server (`cx22`: 2 vCPU / 4 GB / 40 GB)                                         |
| **Postgres**          | Cloud SQL (managed)                                                  | container on the box, pgvector on PG18                                             |
| **Redis**             | Memorystore (managed)                                                | container on the box                                                               |
| **Images from**       | Artifact Registry                                                    | GHCR                                                                               |
| **TLS**               | Caddy + ACME                                                         | Caddy + ACME (identical)                                                           |
| **Backups**           | Cloud SQL automated                                                  | `backups_enabled` snapshots + an offsite `pg_dump` you own                         |
| **`mcp` service**     | ✗ absent (known gap)                                                 | ✓                                                                                  |
| **Est. cost**         | ~52 USD/mo ([gcp-estimate.csv](./gcp-estimate.csv))                  | ~5.39 EUR/mo ([hetzner-estimate.csv](./hetzner-estimate.csv))                      |
| **Applied anywhere?** | **No** — never instantiated                                          | **No** — root exists, commented out                                                |
| **Deploy**            | manual                                                               | automated ([hetzner-deploy.yml](../.github/workflows/hetzner-deploy.yml))          |

Neither has ever run. That is the honest state of both, and it is why the defect lists matter more
than the feature lists.

## Which to choose

### `openthrottle` (GCP)

**Assumes** a GCP project, a VPC, application-default credentials, and someone comfortable with
Cloud SQL and Memorystore.

**Good for** wanting the database to be somebody else's problem. Managed Postgres brings automated
backups, point-in-time recovery, and failover you do not operate. It is also the path with real
IAM, so machine identity comes free (`gcloud auth configure-docker` needs no stored token).

**Costs** roughly ten times as much, and most of that is Cloud SQL plus Memorystore. Note the
estimate prices Cloud SQL for **MySQL** while the stack runs Postgres, so treat the figure as
indicative.

### `openthrottle_hcloud` (Hetzner)

**Assumes** an `HCLOUD_TOKEN`, an SSH key in the project, and that you accept operating Postgres:
backups, restores, and upgrades become yours.

**Good for** running the whole thing for the price of a coffee, and for a deployment you can reason
about end to end — one box, one compose file, no managed-service semantics to learn.

**Costs** ~5.39 EUR/mo including snapshots. The real cost is operational: the nightly offsite dump
and its restore drill are work that Cloud SQL would have absorbed.

**Not the cheaper option for everything.** At rung 2b Postgres moves off the box and the gap
narrows.

## Deploying this yourself

If you are outside OpenThrottle, start at
[`environments/example-hcloud`](./environments/example-hcloud/README.md). It is a complete, copyable
root — `cp -r`, fill in `terraform.tfvars`, choose a state backend, apply.

Our own roots (`staging/`, `production/`, `production-hcloud/`) sit alongside it and are **not**
templates: they carry our project IDs, buckets and hostnames.

Everything a deployment needs is public: the modules, the application compositions, the rendered
compose and cloud-init templates, and the runbooks. What is deliberately _not_ in git is **values** —
`*.tfvars` is ignored repo-wide, because the structure of a deployment is safe to publish and your
administrative IPs are not.

## How an environment selects one

```hcl
# environments/<env>/openthrottle.tf
module "openthrottle" {
  source = "../../applications/openthrottle_hcloud" # or ../../applications/openthrottle

  api_domain       = "api.openthrottle.ai"
  developer_domain = "developer.openthrottle.ai"
  env_name         = local.project_env
  # …
}
```

Ten variables are identical across both modules, so the application-shaped inputs carry over
untouched. The provider-specific ones do not. **Read
[SCALING.md § Rung 4](./SCALING.md#rung-4--change-provider) before assuming this is a one-line
change** — it is ~27 lines of variables, a separate state, a data migration and a DNS change, and it
has five open blockers on the GCP side.

The full shared-vs-provider-specific variable table lives in
[provider-contract.md](./provider-contract.md), and
[`tests/contract/check-provider-contract.sh`](./tests/contract/check-provider-contract.sh) fails CI
if the two drift apart.

## Reducing GCP idle cost

The application composition has never been applied, so **Cloud SQL, Memorystore and Compute E2 are
not costing anything.** The GCP resources that _do_ exist are CI support:

| Resource                                      | Project    | Idle cost                                    | Safe to stop or scale down?                                                                                                  |
| --------------------------------------------- | ---------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Artifact Registry Docker repo                 | staging    | storage only, but **grows without bound**    | Cannot be "stopped". Add a retention policy, or delete old tags. Deleting the repo breaks the GCP path's image source.       |
| Artifact Registry Docker repo                 | production | same                                         | same                                                                                                                         |
| GCS `openthrottle-staging-nx-cache`           | staging    | storage; already has a 90-day lifecycle rule | Leave it. This is developer-experience infrastructure, unrelated to hosting.                                                 |
| GCS `openthrottle-staging-terraform-state`    | staging    | negligible                                   | **Do not touch.** `prevent_destroy` is set for good reason.                                                                  |
| GCS `openthrottle-production-terraform-state` | production | negligible                                   | **Do not touch** — and note it is a backend reference, not a managed resource, so `terraform destroy` will never mention it. |
| Service account `staging-gcs-workflow`        | staging    | free                                         | Leave. Revoke unused **keys**, not the account.                                                                              |
| Service account `production-gcs-workflow`     | production | free                                         | Leave.                                                                                                                       |

**Recommendation, not an action** — nothing here has been changed:

1. **Add an Artifact Registry retention policy.** It is the only line that grows without bound, and
   dual-push keeps feeding it. This is the single highest-value change and it costs nothing in
   capability. It is also already noted as one of the two reasons
   `.github/workflows/openthrottle-docker.yml` is disabled.
2. **Audit and rotate the two service-account JSON keys.** Free, but a standing credential.
3. **Decide the Nx cache deliberately.** Keeping GCS for it is legitimate — but then "we left GCP"
   is not true, and the estimate needs a GCS line.
4. **Change nothing else.** There is no idle compute or managed database to switch off.

**Deleting a resource is not the same as retiring the provider path.** Terraform can recreate a
registry or a bucket; it cannot recreate the images or the state history inside them. Prefer scaling
down and adding lifecycle rules over deletion.

### Precondition for acting on any of this

The Hetzner restore drill must have passed **and** the stack must have run clean for an agreed soak
period.

- Restore drill: **passed 2026-09-10** — dump, offsite ship, recovery and restore into a bare PG18
  scratch database, verified with extensions exercised, ledger intact, and 500/500 embeddings
  answering a nearest-neighbour query. Caveat: the offsite target was a local rclone remote, not a
  Storage Box.
- Soak period: **not started.** No Hetzner box exists, so day zero has not happened. Record the
  first-boot date here and add the agreed soak length (14 days is the suggestion) when it does.

Until the soak has elapsed, treat the recommendations above as unapproved.
