# gcp_cloud_sql_postgres

Terraform module for **Cloud SQL for PostgreSQL** (Zonal Micro instance with low-cost storage), used by OpenThrottle and aligned to `infra/gcp-estimate.csv` (Zonal Micro + low-cost storage in us-west1).

## Inputs

| Name                  | Description                           | Type           | Default         |
| --------------------- | ------------------------------------- | -------------- | --------------- |
| `name`                | Name of the Cloud SQL instance        | `string`       | required        |
| `project_id`          | GCP project ID                        | `string`       | required        |
| `region`              | GCP region (e.g. us-west1)            | `string`       | `"us-west1"`    |
| `tier`                | Instance tier (e.g. db-f1-micro)      | `string`       | `"db-f1-micro"` |
| `disk_size_gb`        | Storage size in GB (low-cost)         | `number`       | `10`            |
| `disk_type`           | PD_SSD or PD_HDD (low-cost = PD_HDD)  | `string`       | `"PD_HDD"`      |
| `database_version`    | PostgreSQL version (e.g. POSTGRES_15) | `string`       | `"POSTGRES_15"` |
| `backup_enabled`      | Enable automated backups              | `bool`         | `true`          |
| `backup_start_time`   | Daily backup start (HH:MM)            | `string`       | `"03:00"`       |
| `public_ip_enabled`   | Assign public IPv4                    | `bool`         | `false`         |
| `private_network`     | VPC self_link for private IP          | `string`       | `null`          |
| `database_flags`      | Database flags [{ name, value }]      | `list(object)` | `[]`            |
| `deletion_protection` | Enable deletion protection            | `bool`         | `false`         |

## Outputs

| Name                 | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `connection_name`    | Connection name (project:region:instance) for clients |
| `private_ip_address` | Private IP (when private_network set)                 |
| `public_ip_address`  | Public IP (when public_ip_enabled)                    |
| `id`                 | Instance id                                           |
| `name`               | Instance name                                         |
| `region`             | Region used                                           |
| `self_link`          | Instance self_link                                    |

## CSV alignment

- **gcp-estimate.csv:** Cloud SQL Zonal Micro + low-cost storage in us-west1; OpenThrottle uses PostgreSQL (this module) instead of MySQL.
- Defaults: `tier = "db-f1-micro"`, `disk_size_gb = 10`, `disk_type = "PD_HDD"`, `region = "us-west1"`, `database_version = "POSTGRES_15"`.

## Example

```hcl
module "openthrottle_postgres" {
  source = "../../modules/gcp_cloud_sql_postgres"

  name       = ${local.project_name}-postgres"
  project_id = local.project_id
  region     = "us-west1"
  tier       = "db-f1-micro"
  disk_size_gb = 10
  disk_type  = "PD_HDD"
  public_ip_enabled = true
  # private_network = google_compute_network.vpc.self_link
}
```

## OpenThrottle usage

Use `connection_name`, `private_ip_address` (or `public_ip_address`), and port **5432** for application connection strings. Create databases and users via `google_sql_database` and `google_sql_user` in the calling configuration if needed.
