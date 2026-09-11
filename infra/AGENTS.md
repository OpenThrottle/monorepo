# infra — agent notes

Terraform IaC providing a **suite of pre-configured hosting options for the same application** — currently GCP and Hetzner Cloud — as environment stacks and reusable modules. **Start at [HOSTING-OPTIONS.md](./HOSTING-OPTIONS.md)**: it says what each option costs, what it assumes, and how an environment selects one. Neither has ever been applied. It is a registered Nx project (`infra`, tags `type:infrastructure`, `technology:terraform`, `production:false`) but has **zero Nx targets**: work with the Terraform CLI from an environment root, never `pnpm nx run infra:*`. There is no application bundle here.

**Consumed by:** nothing in the dependency graph; CI validates it via [.github/workflows/terraform-validate.yml](../.github/workflows/terraform-validate.yml) on any `infra/**` change.

## Layout

- `environments/` — one Terraform root per env (`development/`, `staging/`, `production/`), each with its own GCS state; envs set locals and call application modules.
- `applications/` — reusable app compositions, one per hosting option: `applications/openthrottle` (GCP: Cloud SQL + Memorystore + Compute E2) and `applications/openthrottle_hcloud` (one Hetzner box, everything co-located). **Both are supported; neither may be left to rot.**
- `modules/` — building blocks: `gcp_compute_e2/`, `gcp_memorystore_redis/`, `gcp_cloud_sql_postgres/` (OpenThrottle), `gcp_cloud_sql_mysql/` (legacy), and `hcloud_server/` (Hetzner server + firewall + optional data volume). Note `cloudflare/` is referenced in README.md but does **not** exist — no DNS is managed in Terraform.
- `tests/` — static CI gates: `terraform fmt`, `terraform validate` (`-backend=false`), tfsec, and Conftest/OPA policies.
- `gcp-estimate.csv` — the GCP Pricing Calculator spec the `gcp_*` modules are aligned to. Note it prices Cloud SQL for **MySQL** while the stack runs Postgres, and its total was never billed — the app composition is instantiated nowhere.
- `hetzner-estimate.csv` + `hetzner-topology.md` — the Hetzner sibling estimate, the CX22 sizing decision and the scaling ladder.
- `provider-contract.md` — **read this before touching either application module.** GCP and Hetzner are both supported hosting options; this is the shared variable contract that keeps them interchangeable, plus the known defects on the GCP path.

## Invariants & gotchas

- Environments must not inline app resources — they invoke `../../applications/<app>` with env locals. Keep new resources in modules/applications.
- **Adding a variable to one application module means updating [provider-contract.md](./provider-contract.md) and often the other module.** `tests/contract/check-provider-contract.sh` fails CI if the shared set drifts, a shared variable's type diverges, or a provider-specific variable is undocumented.
- Provider-specific variables are **dropped, not stubbed**. A no-op `postgres_tier` on the Hetzner module would read as supported, plan cleanly, and mislead whoever next sizes a database.
- Editing a `templates/*.tpl` shell template? **Render it before trusting it.** `$$(` is not a Terraform escape (only `$${` and `%%{` are), so it renders as a literal `$$` that bash reads as the PID — valid template, broken script. CI renders and shellchecks both branches.
- New Terraform must pass the Rego policies in `tests/policy/security.rego`: no Cloud SQL `ssl_mode = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"`, no `0.0.0.0/0` in `authorized_networks`, state buckets versioned, `uniform_bucket_level_access = true` on all buckets.
- All gates are config-only (no `plan`/`apply` against live infra in CI); applying requires local `gcloud auth application-default login`.

## Pointers

- [HOSTING-OPTIONS.md](./HOSTING-OPTIONS.md) — **the catalog**: cost, assumptions and selection per option, plus the GCP idle-cost recommendations.
- [provider-contract.md](./provider-contract.md) — the shared variable contract and the known defects on each path. [SCALING.md](./SCALING.md) — per-rung commands, including an honest account of what a provider swap does and does not carry.
- [README.md](./README.md) — setup, module/CSV mapping, connection outputs; [environments/README.md](./environments/README.md), [applications/README.md](./applications/README.md), [tests/README.md](./tests/README.md).
- [docs/infra/](../docs/infra/) — GCS Nx cache, staging service account, notes/ideas.
