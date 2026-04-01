# OpenThrottle infrastructure and request flow

This document describes the Terraform composition, optional deploy path, request flow, and data dependencies for `infra/applications/openthrottle`.

## Terraform module composition

The application module composes a reserved IP for Redis, Cloud SQL Postgres, Compute E2, Memorystore Redis, and (when `deploy_enabled`) firewall and Artifact Registry IAM.

```mermaid
flowchart TB
  subgraph app["OpenThrottle application module"]
    reserved["google_compute_global_address<br/>openthrottle Redis reserved IP<br/>(VPC_PEERING, /29)"]
    postgres["module: gcp_cloud_sql_postgres<br/>openthrottle-{env}-postgres"]
    redis["module: gcp_memorystore_redis<br/>openthrottle-{env}-redis<br/>uses reserved IP range"]
    e2["module: gcp_compute_e2<br/>openthrottle-{env}-e2"]
  end

  subgraph optional["When deploy_enabled = true"]
    fw["google_compute_firewall<br/>tcp 80, 443 → openthrottle-http"]
    iam["google_project_iam_member<br/>roles/artifactregistry.reader<br/>for default GCE SA"]
  end

  reserved --> redis
  e2 -.->|tag: openthrottle-http| fw
  e2 -.->|pull images| iam
```

## Optional deploy path (startup → Docker → Compose)

When `deploy_enabled = true`, the E2 instance receives a startup script that installs Docker, writes config from Terraform, and runs Caddy + openthrottle-server + openthrottle-developer via Docker Compose.

```mermaid
flowchart LR
  subgraph startup["E2 startup script"]
    A["Install Docker +<br/>docker-compose-plugin"]
    B["Install gcloud CLI<br/>(for Artifact Registry)"]
    C["Write /opt/openthrottle<br/>.env, Caddyfile,<br/>docker-compose.yml"]
    D["gcloud auth<br/>configure-docker"]
    E["docker compose pull"]
    F["docker compose up -d"]
  end

  A --> B --> C --> D --> E --> F
```

```mermaid
flowchart TB
  subgraph compose["Docker Compose on E2"]
    caddy["caddy<br/>ports 80, 443"]
    server["openthrottle-server<br/>:3000"]
    developer["openthrottle-developer<br/>:3000"]
  end

  caddy -->|reverse_proxy| server
  caddy -->|reverse_proxy| developer
  caddy -.->|depends_on| server
  caddy -.->|depends_on| developer
```

## Request flow

Traffic from the Internet hits the firewall (ports 80/443), then the E2 instance. Caddy terminates TLS and reverse-proxies by hostname to the server or developer app.

```mermaid
flowchart LR
  Internet["Internet"]
  fw["Firewall<br/>tcp 80, 443<br/>target: openthrottle-http"]
  e2["Compute E2<br/>(tag: openthrottle-http)"]
  caddy["Caddy<br/>:80, :443"]
  api["api_domain"]
  dev["developer_domain"]
  server["openthrottle-server<br/>:3000"]
  developer["openthrottle-developer<br/>:3000"]

  Internet --> fw --> e2 --> caddy
  caddy --> api --> server
  caddy --> dev --> developer
```

- **api_domain** (e.g. `api.staging.example.com`) → Caddy → `openthrottle-server:3000`
- **developer_domain** (e.g. `developer.staging.example.com`) → Caddy → `openthrottle-developer:3000`

## Data dependencies

Postgres and Redis are created by Terraform and used by the server (and developer app when needed). The E2 instance pulls container images from Artifact Registry when `deploy_enabled = true`.

```mermaid
flowchart TB
  subgraph gcp["GCP"]
    postgres["Cloud SQL Postgres<br/>(openthrottle-{env}-postgres)"]
    redis["Memorystore Redis<br/>(openthrottle-{env}-redis)"]
    registry["Artifact Registry<br/>{region}-docker.pkg.dev"]
    e2["Compute E2"]
  end

  subgraph containers["Containers on E2"]
    server["openthrottle-server"]
    developer["openthrottle-developer"]
  end

  e2 -->|pull images| registry
  server -->|POSTGRES_*| postgres
  server -->|REDIS_*| redis
  developer -->|POSTGRES_* / API_URL| postgres
  developer -.->|API_URL| server
```

- **Postgres**: Used by openthrottle-server (and openthrottle-developer for MCP/GraphQL). Connection details come from Terraform into the startup script and `.env`.
- **Redis**: Used by openthrottle-server. Host/port from Memorystore module into startup script and `.env`.
- **Artifact Registry**: E2 default service account has `roles/artifactregistry.reader`; startup script runs `gcloud auth configure-docker` then `docker compose pull`.
