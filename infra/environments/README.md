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

**Artifact Registry:** Both roots define the same Docker repository id (`openthrottle`) in `us-west2`, each in its own project, so image paths match CI: `us-west2-docker.pkg.dev/<GCP_PROJECT>/openthrottle/<image>:<tag>`.

### Artifact Registry: apply order and outputs

1. **Backend:** The GCS state bucket named in `versions.tf` must exist in that GCP project before `terraform init` (see bootstrap note below).
2. **From the env root** (e.g. `infra/environments/staging` or `infra/environments/production`): `terraform init` → `terraform plan` → `terraform apply`.
3. **Verify** registry wiring after apply:

   ```bash
   terraform output artifact_registry_docker_host
   terraform output artifact_registry_repository_id
   terraform output artifact_registry_image_prefix
   ```

   - `artifact_registry_docker_host` — hostname only (e.g. `us-west2-docker.pkg.dev`). Should match workflow `ARTIFACT_REGISTRY_REGION` (`us-west2` → `us-west2-docker.pkg.dev`).
   - `artifact_registry_repository_id` — always `openthrottle` in this repo (Docker repository id).
   - `artifact_registry_image_prefix` — full path prefix **without** image name or tag: `us-west2-docker.pkg.dev/<GCP_PROJECT>/openthrottle`. Example image URL: `<prefix>/openthrottle-server:sha-<gitsha>`.

### GitHub Actions pairing

The workflow [.github/workflows/openthrottle-docker.yml](../../.github/workflows/openthrottle-docker.yml) builds `registry` as `${ARTIFACT_REGISTRY_REGION}-docker.pkg.dev/${GOOGLE_PROJECT_ID}/openthrottle`. Set repository **Variables** so `GOOGLE_PROJECT_ID` matches the GCP project in that environment:

| Environment | Terraform root                  | GitHub variable (repo)                                     | Secret for push (JSON key SA)   |
| ----------- | ------------------------------- | ---------------------------------------------------------- | ------------------------------- |
| Staging     | `infra/environments/staging`    | `GOOGLE_PROJECT_ID_STAGING` → `openthrottle-staging`       | `GOOGLE_CREDENTIALS_STAGING`    |
| Production  | `infra/environments/production` | `GOOGLE_PROJECT_ID_PRODUCTION` → `openthrottle-production` | `GOOGLE_CREDENTIALS_PRODUCTION` |

`GOOGLE_PROJECT_ID` in the workflow resolves from those vars by branch; the value must equal the GCP `project_id` embedded in `artifact_registry_image_prefix` or pushes will target the wrong project. `ARTIFACT_REGISTRY_REGION` in the workflow (`us-west2`) must stay aligned with the Terraform module `location` in `artifact_registry.tf`.

**Bootstrap:** The GCS bucket named in `versions.tf` must exist in that project before `terraform init` can use the remote backend (same pattern as [../README.md](../README.md) for staging). Create the bucket (or apply a one-time bootstrap) in each project as needed.

---

[ot-production]: https://console.cloud.google.com/welcome?project=openthrottle-production 'openthrottle-production'
[ot-staging]: https://console.cloud.google.com/welcome?project=openthrottle-staging 'openthrottle-staging'
