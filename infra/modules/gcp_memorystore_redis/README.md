# gcp_memorystore_redis

Terraform module for **Memorystore for Redis** (Basic tier M1), aligned to `infra/gcp-estimate.csv` (Redis Capacity Basic M1 in us-west1).

The module allocates the instance's VPC peering range itself. A caller supplies
the `network`, not a hand-picked CIDR: the range exists only for this instance,
is named after it, and is meaningless without it. Allocating it outside and
passing it back in is how the two drift apart.

## Inputs

| Name                     | Description                                  | Type          | Default       |
| ------------------------ | -------------------------------------------- | ------------- | ------------- |
| `name`                   | Name of the Redis instance                   | `string`      | required      |
| `project_id`             | GCP project ID                               | `string`      | required      |
| `region`                 | GCP region (e.g. us-west1)                   | `string`      | `"us-west1"`  |
| `tier`                   | Service tier: BASIC or STANDARD_HA           | `string`      | `"BASIC"`     |
| `memory_size_gb`         | Memory size in GB (1 = M1)                   | `number`      | `1`           |
| `redis_version`          | Redis version (e.g. REDIS_7_2)               | `string`      | `"REDIS_7_2"` |
| `network`                | VPC network the instance peers into          | `string`      | required      |
| `reserved_prefix_length` | Prefix length of the allocated peering range | `number`      | `29`          |
| `labels`                 | Labels for the instance                      | `map(string)` | `{}`          |

## Outputs

| Name                | Description                                 |
| ------------------- | ------------------------------------------- |
| `host`              | Host IP (connection endpoint)               |
| `port`              | Port                                        |
| `id`                | Instance id                                 |
| `name`              | Instance name                               |
| `region`            | Region used                                 |
| `reserved_address`  | Base address of the allocated peering range |
| `reserved_ip_range` | The allocated peering range in CIDR form    |

## CSV alignment

- **gcp-estimate.csv:** `Memorystore for Redis (Cloud Memorystore)`, `Redis Capacity Basic M1 Iowa/South Carolina/Oregon`, region `us-west1`.
- Defaults: `tier = "BASIC"`, `memory_size_gb = 1` (M1), `region = "us-west1"`.

## Example

```hcl
module "openthrottle_redis" {
  source = "../../modules/gcp_memorystore_redis"

  name           = "openthrottle-redis"
  network        = local.project_network
  project_id     = local.project_id
  region         = "us-west1"
  tier           = "BASIC"
  memory_size_gb = 1
}
```
