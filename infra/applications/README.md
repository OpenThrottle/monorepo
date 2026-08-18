# Application modules

Application modules in `infra/applications/` are **reusable Terraform compositions** that define a full application stack (resources + child module calls). They are **not** tied to any single environment; instead, each **environment** wires an application by calling its module and passing env-specific variables.

## Applications vs environments

| Layer                     | Purpose                                                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`applications/<app>/`** | Reusable app composition: which resources and modules make up the app (e.g. OpenThrottle = reserved IP + Cloud SQL Postgres + Compute E2 + Memorystore Redis). Same implementation is used across staging, production, and future environments.                           |
| **`environments/<env>/`** | Env-specific wiring: project, region, zone, network, and env name. An environment calls one or more application modules and passes `local.project_id`, `local.project_region`, `local.project_zone`, `local.project_network`, `local.project_env` (or equivalent locals). |

Environments do **not** inline the app’s resources; they invoke the application module and optionally override variables (e.g. disk size, machine type) when needed.

## Application module contract

Each application under `applications/<name>/` is a Terraform module with:

- **Required variables**: `project_id`, `region`, `zone`, `network`, `env_name` (or similar). These come from the calling environment’s locals.
- **Optional variables**: Overrides for sizing or behavior (e.g. `disk_size_gb`, `machine_type`, `memory_size_gb`). Defaults are aligned to the app’s spec (e.g. `infra/estimates/archive/gcp-estimate-2026-03-04-mysql-superseded.csv` for OpenThrottle).
- **Module sources**: Child modules are referenced relative to the application directory, e.g. `source = "../../modules/gcp_cloud_sql_postgres"`.
- **Outputs**: The application module exposes outputs (e.g. `redis_host`, `postgres_connection_name`, `compute_instance_name`) that the environment may re-export in its own `outputs.tf`.

## Available applications

- **`openthrottle`** — OpenThrottle stack: reserved IP for Redis, Cloud SQL PostgreSQL, Compute Engine E2, Memorystore Redis. Required vars: `project_id`, `region`, `zone`, `network`, `env_name`. See `openthrottle/variables.tf` for optional overrides.

## Adding a new application

1. Create `applications/<app_name>/` with `main.tf`, `variables.tf`, and `outputs.tf`.
2. Define required variables for `project_id`, `region`, `zone`, `network`, and an env identifier (e.g. `env_name`).
3. Compose resources and/or `module` blocks using `../../modules/...` for shared modules.
4. In each environment that should run the app, add a `module "<app>" { source = "../../applications/<app_name>" ... }` block and pass the environment’s locals (and any overrides).

See **`infra/README.md`** for the overall layout (environments, modules, and Terraform workflow).
