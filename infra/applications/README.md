# Application modules

Application modules in `infra/applications/` are **reusable Terraform compositions** that define a full application stack (resources + child module calls). They are **not** tied to any single environment; instead, each **environment** wires an application by calling its module and passing env-specific variables.

There is **one module per hosting option**, and the same application runs on either. See [../HOSTING-OPTIONS.md](../HOSTING-OPTIONS.md) for cost and fit, and [../provider-contract.md](../provider-contract.md) for the variable contract that keeps them comparable rather than merely coexistent.

## Applications vs environments

| Layer                     | Purpose                                                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`applications/<app>/`** | Reusable app composition: which resources and modules make up the app (e.g. OpenThrottle = reserved IP + Cloud SQL Postgres + Compute E2 + Memorystore Redis). Same implementation is used across staging, production, and future environments.                           |
| **`environments/<env>/`** | Env-specific wiring: project, region, zone, network, and env name. An environment calls one or more application modules and passes `local.project_id`, `local.project_region`, `local.project_zone`, `local.project_network`, `local.project_env` (or equivalent locals). |

Environments do **not** inline the app’s resources; they invoke the application module and optionally override variables (e.g. disk size, machine type) when needed.

## Application module contract

Each application under `applications/<name>/` is a Terraform module with:

- **Required variables**: `env_name` plus whatever the provider needs — `project_id`, `region`, `zone`, `network` for GCP; `api_domain` / `developer_domain` and optionally `location` for Hetzner. These come from the calling environment’s locals. Do **not** assume GCP's set is universal: that assumption is what this README used to encode.
- **Optional variables**: Overrides for sizing or behavior (e.g. `disk_size_gb`, `machine_type`, `memory_size_gb`). Defaults are aligned to the app’s spec (e.g. `infra/gcp-estimate.csv` for OpenThrottle).
- **Module sources**: Child modules are referenced relative to the application directory, e.g. `source = "../../modules/gcp_cloud_sql_postgres"`.
- **Outputs**: The application module exposes outputs (e.g. `redis_host`, `postgres_connection_name`, `compute_instance_name`) that the environment may re-export in its own `outputs.tf`.

## Available applications

Both target the same application. Pick one per environment.

- **[`openthrottle`](./openthrottle/README.md)** — **GCP.** Reserved IP for Redis, Cloud SQL
  PostgreSQL, Compute Engine E2, Memorystore Redis. Postgres and Redis are managed services.
  Required vars: `project_id`, `region`, `zone`, `network`, `env_name`. ~52 USD/mo.
- **[`openthrottle_hcloud`](./openthrottle_hcloud/README.md)** — **Hetzner Cloud.** One box running
  Caddy, server, developer, `mcp`, Postgres and Redis as containers. Required vars: `env_name`,
  `api_domain`, `developer_domain`. ~5.39 EUR/mo. Runbooks:
  [`SECRETS.md`](./openthrottle_hcloud/SECRETS.md),
  [`CUTOVER.md`](./openthrottle_hcloud/CUTOVER.md).

**Neither has ever been applied.** Every `module "openthrottle"` block in `environments/` is
commented out.

### The shared contract

Ten variables are identical across both modules, so application-shaped inputs carry over when
switching: `api_domain`, `caddy_image`, `deploy_enabled`, `developer_domain`, `developer_image`,
`env_name`, `postgres_db_name`, `postgres_password`, `postgres_user`, `server_image`.

Provider-specific variables are **dropped, not stubbed** — a no-op `postgres_tier` on the Hetzner
module would read as supported, plan cleanly, and mislead the next person to size a database.
[`../tests/contract/check-provider-contract.sh`](../tests/contract/check-provider-contract.sh) fails
CI if the shared set drifts, a shared variable's type diverges, or a provider-specific variable is
added without being documented.

Switching an environment between them is **not** a one-line change: see
[`../SCALING.md` § Rung 4](../SCALING.md#rung-4--change-provider) for what does and does not carry
over, and the open blockers.

## Adding a new application

1. Create `applications/<app_name>/` with `main.tf`, `variables.tf`, and `outputs.tf`.
2. Define required variables for an env identifier (e.g. `env_name`) plus whatever the provider genuinely needs. If the new module targets the same application as an existing one, **reuse the shared variable names and types exactly** and record any divergence in [../provider-contract.md](../provider-contract.md) — the contract check enforces this.
3. Compose resources and/or `module` blocks using `../../modules/...` for shared modules.
4. In each environment that should run the app, add a `module "<app>" { source = "../../applications/<app_name>" ... }` block and pass the environment’s locals (and any overrides).

See **`infra/README.md`** for the overall layout (environments, modules, and Terraform workflow).
