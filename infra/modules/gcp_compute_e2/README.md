# gcp_compute_e2

Terraform module for **Compute Engine E2** instance(s) with **SSD-backed persistent disk**, aligned to `infra/estimates/archive/gcp-estimate-2026-03-04-mysql-superseded.csv` (E2 instance + 10 GB SSD PD in us-west1).

## Inputs

| Name           | Description                                              | Type          | Default                                       |
| -------------- | -------------------------------------------------------- | ------------- | --------------------------------------------- |
| `disk_size_gb` | Size of the SSD persistent disk (GB)                     | `number`      | `10`                                          |
| `machine_type` | GCP machine type (e.g. e2-micro)                         | `string`      | `"e2-micro"`                                  |
| `name`         | Name prefix for the instance and disk                    | `string`      | required                                      |
| `network`      | VPC network id or self_link                              | `string`      | required                                      |
| `project_id`   | GCP project ID                                           | `string`      | required                                      |
| `region`       | GCP region (e.g. us-west1)                               | `string`      | `"us-west1"`                                  |
| `zone`         | GCP zone (e.g. us-west1-a). Empty = first zone in region | `string`      | `""`                                          |
| `boot_image`   | Boot image (pinned dated image for reproducibility)      | `string`      | `"debian-cloud/debian-12-bookworm-v20260609"` |
| `labels`       | Labels for the instance and disk                         | `map(string)` | `{}`                                          |

## Outputs

| Name                 | Description        |
| -------------------- | ------------------ |
| `instance_id`        | Instance id        |
| `instance_name`      | Instance name      |
| `instance_self_link` | Instance self_link |
| `disk_id`            | SSD disk id        |
| `disk_self_link`     | SSD disk self_link |
| `zone`               | Zone used          |

## Example

```hcl
module "openthrottle_compute" {
  source = "../../modules/gcp_compute_e2"

  name        = "openthrottle-e2"
  project_id  = local.project_id
  network     = google_compute_network.vpc.id
  region      = "us-west1"
  zone        = "us-west1-a"
  machine_type = "e2-micro"
  disk_size_gb = 10
}
```
