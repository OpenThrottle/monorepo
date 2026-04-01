# gcp_memorystore_redis

Terraform module for **Memorystore for Redis** (Basic tier M1), aligned to `infra/gcp-estimate.csv` (Redis Capacity Basic M1 in us-west1).

## Inputs

| Name                | Description                        | Type          | Default       |
| ------------------- | ---------------------------------- | ------------- | ------------- |
| `name`              | Name of the Redis instance         | `string`      | required      |
| `project_id`        | GCP project ID                     | `string`      | required      |
| `region`            | GCP region (e.g. us-west1)         | `string`      | `"us-west1"`  |
| `tier`              | Service tier: BASIC or STANDARD_HA | `string`      | `"BASIC"`     |
| `memory_size_gb`    | Memory size in GB (1 = M1)         | `number`      | `1`           |
| `redis_version`     | Redis version (e.g. REDIS_7_2)     | `string`      | `"REDIS_7_2"` |
| `reserved_ip_range` | CIDR for Redis (e.g. 10.0.0.0/29)  | `string`      | required      |
| `labels`            | Labels for the instance            | `map(string)` | `{}`          |

## Outputs

| Name     | Description                   |
| -------- | ----------------------------- |
| `host`   | Host IP (connection endpoint) |
| `port`   | Port                          |
| `id`     | Instance id                   |
| `name`   | Instance name                 |
| `region` | Region used                   |

## CSV alignment

- **gcp-estimate.csv:** `Memorystore for Redis (Cloud Memorystore)`, `Redis Capacity Basic M1 Iowa/South Carolina/Oregon`, region `us-west1`.
- Defaults: `tier = "BASIC"`, `memory_size_gb = 1` (M1), `region = "us-west1"`.

## Example

```hcl
module "openthrottle_redis" {
  source = "../../modules/gcp_memorystore_redis"

  name              = "openthrottle-redis"
  project_id        = local.project_id
  region            = "us-west1"
  tier              = "BASIC"
  memory_size_gb    = 1
  reserved_ip_range = "10.0.0.0/29"
}
```
