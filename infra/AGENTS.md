# infra — agent notes

Terraform IaC for GCP (+ a Cloudflare module) — environment stacks and reusable modules. It is a registered Nx project (`infra`, tags `type:infrastructure`, `technology:terraform`, `production:false`) but has **zero Nx targets**: work with the Terraform CLI from an environment root, never `pnpm nx run infra:*`. There is no application bundle here.

**Consumed by:** nothing in the dependency graph; CI validates it via [.github/workflows/terraform-validate.yml](../.github/workflows/terraform-validate.yml) on any `infra/**` change.

## Layout

- `environments/` — one Terraform root per env (`development/`, `staging/`, `production/`), each with its own GCS state; envs set locals and call application modules.
- `applications/` — reusable app compositions (e.g. `applications/openthrottle/`) shared across environments.
- `modules/` — building blocks: `cloudflare/`, `gcp_compute_e2/`, `gcp_memorystore_redis/`, `gcp_cloud_sql_postgres/` (OpenThrottle), `gcp_cloud_sql_mysql/` (legacy).
- `tests/` — static CI gates: `terraform fmt`, `terraform validate` (`-backend=false`), tfsec, and Conftest/OPA policies.
- `gcp-estimate.csv` — the GCP Pricing Calculator spec the modules are aligned to.

## Invariants & gotchas

- Environments must not inline app resources — they invoke `../../applications/<app>` with env locals. Keep new resources in modules/applications.
- New Terraform must pass the Rego policies in `tests/policy/security.rego`: no Cloud SQL `ssl_mode = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"`, no `0.0.0.0/0` in `authorized_networks`, state buckets versioned, `uniform_bucket_level_access = true` on all buckets.
- All gates are config-only (no `plan`/`apply` against live infra in CI); applying requires local `gcloud auth application-default login`.

## Pointers

- [README.md](./README.md) — setup, module/CSV mapping, connection outputs; [environments/README.md](./environments/README.md), [applications/README.md](./applications/README.md), [tests/README.md](./tests/README.md).
- [docs/infra/](../docs/infra/) — GCS Nx cache, staging service account, notes/ideas.
