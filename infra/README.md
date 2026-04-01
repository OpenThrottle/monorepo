# Infrastructure as Code

This directory contains Infrastructure as Code (IaC) configurations for managing cloud resources using Terraform. The infrastructure is organized by environments and uses modules for reusable components.

**Terraform:**

- Declarative infrastructure provisioning
- Cloud-agnostic tooling
- Open source and widely adopted
- State management for tracking infrastructure changes

**Current Setup:**

- **Provider**: Google Cloud Platform (GCP)
- **Environments**: Staging is implemented under `environments/staging/`; additional envs (development, production) can be added using the same pattern.
- **Modules**: Cloudflare (`modules/cloudflare/`) and OpenThrottle-oriented GCP building blocks (`gcp_compute_e2`, `gcp_memorystore_redis`, `gcp_cloud_sql_mysql`, `gcp_cloud_sql_postgres`). Environment stacks may also define one-off resources (for example a Terraform state bucket in staging).
- **Resources**: Compute instances, Cloud SQL, Memorystore, Cloud Storage, and other GCP services as defined per environment.

## Providers

- https://registry.terraform.io/providers/hashicorp/google/latest

## Links

- https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/getting_started
- https://console.cloud.google.com/compute/instances?project=monorepo-staging-473406&supportedpurview=project

## Setup

### Prerequisites

1. **Install Terraform**: Installed via Homebrew in `scripts/software.sh`, which `scripts/setup.sh` runs as part of monorepo setup (repo root)
2. **Authenticate with GCP**: Run `gcloud auth application-default login` to set up Application Default Credentials
3. **Set GCP Project**: Ensure you're working with the correct GCP project

### Getting Started

```bash
# 📂 Navigate to the environment you want to work with
cd infra/environments/staging

# 🔧 Install Terraform providers and modules
terraform init

# 📋 Preview changes before applying
terraform plan

# ✅ Apply changes (after reviewing the plan)
terraform apply
```

### Applications vs environments

- **`applications/`**: Reusable **app compositions** — Terraform modules that define a full application stack (resources + child module calls). The same application module is used across staging, production, and future environments. Each app has required variables (`project_id`, `region`, `zone`, `network`, `env_name`) and optional overrides (e.g. disk size, machine type). See **[applications/README.md](applications/README.md)** for the pattern and available applications.
- **`environments/`**: **Env-specific wiring** — Each environment directory sets locals (e.g. `project_id`, region, zone, network, env name) and calls application modules with those values. Environments do not inline app resources; they invoke `../../applications/<app>` and pass locals (and any overrides).

### Directory structure

- **`applications/`**: Reusable application modules (e.g. `openthrottle`). See [applications/README.md](applications/README.md).
- **`environments/`**: Environment-specific configurations (currently **`staging/`**; add `development/` or `production/` by copying the staging layout and adjusting locals).
- **`modules/`**: Reusable Terraform building-block modules
  - `cloudflare/`: Cloudflare configuration module
  - **OpenThrottle GCP** (aligned to `infra/gcp-estimate.csv`):
    - `gcp_compute_e2/`: Compute Engine E2 + SSD PD
    - `gcp_memorystore_redis/`: Memorystore for Redis Basic (M1)
    - `gcp_cloud_sql_mysql/`: Cloud SQL MySQL Zonal Micro + low-cost storage (legacy / non-OT)
    - `gcp_cloud_sql_postgres/`: Cloud SQL PostgreSQL Zonal Micro + low-cost storage (OpenThrottle)

## OpenThrottle GCP modules and gcp-estimate.csv

The OpenThrottle stack is specified in **`infra/gcp-estimate.csv`** (GCP Pricing Calculator export). The following modules implement that spec in `us-west1`. The **application composition** lives in `applications/openthrottle/`; staging (and other environments) call it from `environments/<env>/openthrottle.tf` with env-specific `project_id`, `region`, `zone`, `network`, and `env_name` (config/plan only—no apply in this setup).

### Module list and CSV mapping

| Module                     | CSV spec                                                                     | Key inputs                                                                                                                                                                                     | Key outputs                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **gcp_compute_e2**         | E2 Instance Core/RAM, SSD backed PD 10 GB, us-west1                          | `name`, `project_id`, `network`, `region`, `zone`, `machine_type` (default `e2-micro`), `disk_size_gb` (default `10`)                                                                          | `instance_name`, `instance_self_link`, `disk_self_link`, `zone`                                   |
| **gcp_memorystore_redis**  | Redis Capacity Basic M1, us-west1                                            | `name`, `project_id`, `region` (default `us-west1`), `tier` (default `BASIC`), `memory_size_gb` (default `1`), `reserved_ip_range`                                                             | `host`, `port`, `id`, `name`, `region`                                                            |
| **gcp_cloud_sql_mysql**    | Cloud SQL MySQL Zonal Micro + Low cost storage, us-west1 (legacy)            | same inputs/outputs as Postgres                                                                                                                                                                | same                                                                                              |
| **gcp_cloud_sql_postgres** | Cloud SQL PostgreSQL Zonal Micro + Low cost storage, us-west1 (OpenThrottle) | `name`, `project_id`, `region` (default `us-west1`), `tier` (default `db-f1-micro`), `disk_size_gb` (default `10`), `disk_type` (default `PD_HDD`), `database_version` (default `POSTGRES_15`) | `connection_name`, `private_ip_address`, `public_ip_address`, `id`, `name`, `region`, `self_link` |

Full input/output tables and examples: see each module’s `README.md` under `modules/gcp_compute_e2/`, `modules/gcp_memorystore_redis/`, `modules/gcp_cloud_sql_mysql/`, and `modules/gcp_cloud_sql_postgres/`.

### Connection endpoints for OpenThrottle apps

When the staging (or target) environment is applied, use these outputs for app configuration:

- **Compute (E2):** `ot_compute_instance_name` — instance name for SSH/deploy or reference.
- **Redis:** `ot_redis_host` and `ot_redis_port` — Redis connection endpoint (e.g. `REDIS_URL=redis://<host>:<port>`).
- **PostgreSQL:** `ot_cloud_sql_connection_name` — Cloud SQL connection name (`project:region:instance`) for Cloud SQL Auth Proxy or direct connection; use with `private_ip_address` or `public_ip_address` (and port `5432`) as needed.

These are exposed as Terraform outputs in `environments/staging/outputs.tf` (e.g. after `terraform apply`, use `terraform output ot_redis_host`).

## Terraform Workflow

1. **Scope**: Define what infrastructure needs to be created or modified
2. **Author**: Write or update Terraform configuration files
3. **Initialize**: Run `terraform init` to download providers and modules
4. **Plan**: Run `terraform plan` to preview changes
5. **Apply**: Run `terraform apply` to create or update resources

## Related Documentation

- **OpenThrottle GCP estimate**: `infra/gcp-estimate.csv` — Pricing Calculator spec; modules above align to this CSV.
- **Nx GCS cache setup**: [docs/infra/nx-gcs-cache-setup.md](../docs/infra/nx-gcs-cache-setup.md) — Nx remote cache bucket
- **Staging GCS workflow SA (CI key + GitHub secret)**: [docs/infra/staging-gcs-workflow-service-account.md](../docs/infra/staging-gcs-workflow-service-account.md) — JSON key via `gcloud`, `GOOGLE_CREDENTIALS_STAGING`, rotation
- **Infrastructure notes**: [docs/infra/NOTES.md](../docs/infra/NOTES.md) — learning resources and operational notes
- **Infrastructure ideas**: [docs/infra/IDEAS.md](../docs/infra/IDEAS.md) — future infrastructure improvements

This repo uses **pnpm** at the monorepo root; there are no Nx tasks defined for `infra` in `infra/package.json` — use the Terraform CLI from an environment directory as shown above.
