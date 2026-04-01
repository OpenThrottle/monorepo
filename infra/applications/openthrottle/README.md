# OpenThrottle application module

See **[infrastructure.md](./infrastructure.md)** for Mermaid diagrams of Terraform composition, deploy path, request flow, and data dependencies.

Terraform module that composes:

- Reserved IP for Memorystore Redis (VPC peering)
- Cloud SQL PostgreSQL
- Compute Engine E2 instance (+ optional Docker deploy)
- Memorystore Redis

## Optional: Deploy Docker on E2

When `deploy_enabled = true`, the E2 instance:

- Gets a **startup script** that installs Docker, writes env and compose from Terraform, and runs `docker compose up -d` (openthrottle-server + openthrottle-developer + Caddy).
- Is tagged `openthrottle-http` and a **firewall rule** allows ingress tcp 80, 443.
- Uses the default Compute Engine service account with **Artifact Registry read** so it can pull images.

### Required variables when `deploy_enabled = true`

| Variable            | Description                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `server_image`      | Full image for openthrottle-server (e.g. `us-west2-docker.pkg.dev/PROJECT/openthrottle/openthrottle-server:sha-xxx`). |
| `developer_image`   | Full image for openthrottle-developer.                                                                                |
| `api_domain`        | Hostname for the API (Caddy routes to server).                                                                        |
| `developer_domain`  | Hostname for the developer app.                                                                                       |
| `postgres_password` | Cloud SQL password (sensitive).                                                                                       |

Optional: `artifact_registry_region` (default `us-west2`), `caddy_image`, `postgres_db_name`, `postgres_user`.

### Example (staging)

```hcl
module "openthrottle" {
  source = "../../applications/openthrottle"

  env_name   = "staging"
  network    = local.openthrottle_network
  project_id = local.project_id
  region     = "us-west1"
  zone       = "us-west1-a"

  deploy_enabled    = true
  server_image      = "us-west2-docker.pkg.dev/my-project/openthrottle/openthrottle-server:sha-abc1234"
  developer_image   = "us-west2-docker.pkg.dev/my-project/openthrottle/openthrottle-developer:sha-abc1234"
  api_domain        = "api.staging.example.com"
  developer_domain  = "developer.staging.example.com"
  postgres_password = var.openthrottle_postgres_password
}
```

Templates: `templates/startup.sh.tpl`, `templates/docker-compose.yml.tpl`, `templates/Caddyfile.tpl`. See [single-box-run-design.md](../../../docs/openthrottle/single-box-run-design.md).
