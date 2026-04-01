# Environments

| Project Name                             | Project Number |
| ---------------------------------------- | -------------- |
| [openthrottle-production][ot-production] | 11318907976    |
| [openthrottle-staging][ot-staging]       | 605061926112   |

---

## Terraform roots (staging vs production)

Each GCP project has its **own Terraform working directory** under `infra/environments/<env>/` with a **dedicated GCS backend** and **separate state file**. This repo does **not** use a single stack with [Terraform workspaces](https://developer.hashicorp.com/terraform/language/state/workspaces) to switch staging/production; that keeps backends, credentials, and blast radius explicit per project.

| Directory     | GCP project               | State bucket (GCS backend)                |
| ------------- | ------------------------- | ----------------------------------------- |
| `staging/`    | `openthrottle-staging`    | `openthrottle-staging-terraform-state`    |
| `production/` | `openthrottle-production` | `openthrottle-production-terraform-state` |

**Artifact Registry:** Both roots define the same Docker repository id (`openthrottle`) in `us-west2`, each in its own project, so image paths match CI: `us-west2-docker.pkg.dev/<GCP_PROJECT>/openthrottle/<image>:<tag>`. Pair GitHub Actions variables `GOOGLE_PROJECT_ID_STAGING` / `GOOGLE_PROJECT_ID_PRODUCTION` (or repo equivalents) with the project you push to.

**Bootstrap:** The GCS bucket named in `versions.tf` must exist in that project before `terraform init` can use the remote backend (same pattern as [../README.md](../README.md) for staging). Create the bucket (or apply a one-time bootstrap) in each project as needed.

---

[ot-production]: https://console.cloud.google.com/welcome?project=openthrottle-production 'openthrottle-production'
[ot-staging]: https://console.cloud.google.com/welcome?project=openthrottle-staging 'openthrottle-staging'
