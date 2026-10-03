# openthrottle_gcp

The OpenThrottle application composition for **Google Cloud**: a Compute Engine E2 instance running
Caddy, the server, the developer app and `mcp`, with Postgres and Redis as managed services.

This is a **sibling** of [`openthrottle_hcloud`](../openthrottle_hcloud/README.md) (Hetzner), not a
replacement. Both providers are supported — see
[`infra/provider-contract.md`](../../provider-contract.md).

See **[infrastructure.md](./infrastructure.md)** for Mermaid diagrams of Terraform composition, deploy path, request flow, and data dependencies.

Terraform module that composes:

- Cloud SQL PostgreSQL
- Compute Engine E2 instance, with its firewall rules and tag (+ optional Docker deploy)
- Memorystore Redis, with its VPC peering range

## Optional: Deploy Docker on E2

When `deploy_enabled = true`, the E2 instance:

- Gets a **startup script** that installs Docker, writes env and compose from Terraform, and runs `docker compose up -d` (openthrottle-server + openthrottle-developer + Caddy).
- Is tagged `openthrottle-{env}-e2-http` and a **firewall rule** allows ingress tcp 80, 443. Both the rule and the tag belong to the `gcp_compute_e2` module; set `ssh_allowed_cidrs` to add a scoped rule for tcp 22.
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
  source = "../../applications/openthrottle_gcp"

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

Templates: `templates/startup.sh.tpl`, `templates/docker-compose.yml.tpl`, `templates/Caddyfile.tpl`.
