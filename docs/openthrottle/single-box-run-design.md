# Single-box run design: openthrottle-server + openthrottle-developer on E2

This document designs running **openthrottle-server** and **openthrottle-developer** as containers on the existing **OpenThrottle E2 VM** (single box). It is part of the plan _Docker build and deploy for OpenThrottle apps on single box_. It should be read with [run-build-and-docker-current-state.md](./run-build-and-docker-current-state.md) and [docker-image-build-strategy.md](./docker-image-build-strategy.md).

---

## 1. Goal and constraints

- **Goal:** Run both apps on the **single Compute Engine E2** instance already provisioned by `infra/applications/openthrottle` (module `openthrottle_compute_e2`).
- **Constraints:** One VM; no Kubernetes; minimize cost; use existing Cloud SQL Postgres and Memorystore Redis in the same VPC.

---

## 2. Ports and networking

### 2.1 Host ports

| Port    | Purpose                                                          |
| ------- | ---------------------------------------------------------------- |
| **80**  | HTTP (redirect to 443 or serve redirect).                        |
| **443** | HTTPS — reverse proxy (Caddy) only. All app traffic enters here. |

Containers do **not** publish 6010/6012 to the host. Internal container ports stay internal; only the proxy is exposed.

### 2.2 Internal (container) ports

| Service                | Container port                                       | Protocol         |
| ---------------------- | ---------------------------------------------------- | ---------------- |
| openthrottle-server    | 3000 (configurable via `PORT`)                       | HTTP + WebSocket |
| openthrottle-developer | 3000 (React Router default; configurable via `PORT`) | HTTP             |
| Caddy (reverse proxy)  | 80, 443 (host-published)                             | HTTP/HTTPS       |

Server and developer run on the same Docker network; Caddy reaches them by service name (e.g. `openthrottle-server:3000`, `openthrottle-developer:3000`).

### 2.3 Firewall (GCP)

- The E2 instance has `access_config {}` (ephemeral public IP). Ingress to the VM should allow **80** and **443** from the internet (or from a load balancer / Cloudflare) so the proxy can serve traffic. Today the openthrottle Terraform module does **not** create firewall rules; the next task (Terraform wire) should add a rule (e.g. `google_compute_firewall`) for `tcp:80`, `tcp:443` to the instance’s network tag or target.

---

## 3. Reverse proxy

### 3.1 Choice: Caddy

- **Caddy** is used in this repo for local dev (see [tools/caddy/](../../tools/caddy/)); reusing it on E2 keeps the model consistent (host-based routing, automatic WebSocket passthrough, optional TLS).
- **Alternatives:** nginx, Traefik. Caddy is chosen for simplicity (single config file, automatic HTTPS with Let’s Encrypt).

### 3.2 Role

- **TLS termination** on 443 (Let’s Encrypt in production/staging; or self-signed for internal staging).
- **Host-based routing:**
  - `api.<domain>` → `http://openthrottle-server:3000`
  - `developer.<domain>` (or `app.<domain>`) → `http://openthrottle-developer:3000`
- **WebSocket:** Caddy passes WebSocket through by default; no extra config needed for openthrottle-server Socket.IO/GraphQL WS.

### 3.3 Caddy on the box

- **Option A (recommended):** Run Caddy as a **container** in the same Docker Compose stack, with its own Caddyfile (mount or baked into image). Same lifecycle as the app containers (pull, up, restart).
- **Option B:** Install Caddy on the host and proxy to `localhost:3000` (server) and `localhost:3001` (developer) with containers publishing those ports. Simpler host networking but mixes host and container lifecycle; **not** recommended.

Caddyfile for E2 can mirror [tools/caddy/Caddyfile](../../tools/caddy/Caddyfile) but with production hostnames and upstreams:

- `api.<staging-domain>` → `openthrottle-server:3000`
- `developer.<staging-domain>` → `openthrottle-developer:3000`

---

## 4. Docker Compose vs systemd + docker run

| Approach                 | Pros                                                                                                                                   | Cons                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Docker Compose**       | Single file; declarative; shared network; easy env and restarts; same pattern as local `applications/openthrottle/docker-compose.yml`. | Requires Docker + Compose on the VM.                                              |
| **systemd + docker run** | No Compose dependency; fine-grained unit files.                                                                                        | More moving parts; manual network and env; harder to keep in sync with Terraform. |

**Recommendation:** **Docker Compose.** The Terraform/startup flow (next task) will: install Docker (and Docker Compose plugin or standalone), pull images from Artifact Registry, and run `docker compose up -d` (compose file provided via metadata, startup script, or checked-out repo). Compose file defines:

- `openthrottle-server` (image from Artifact Registry; env from file or env vars).
- `openthrottle-developer` (image from Artifact Registry; env points `API_URI` / `API_URL` at the proxy’s api hostname).
- `caddy` (image `caddy:latest` or internal build; Caddyfile from config/volume).

No systemd units for the app processes; optionally one systemd unit to run `docker compose up -d` at boot (or rely on a startup script that runs once).

---

## 5. Env and config (Cloud SQL, Redis, app)

### 5.1 Cloud SQL Postgres

- **Current Terraform:** Cloud SQL has `public_ip_enabled = true` (default in openthrottle module). E2 can connect via public IP if the instance’s IP is in Cloud SQL **authorized networks**, or via **Private IP** if Cloud SQL is attached to the same VPC (`private_network`).
- **Recommended for production/staging:** Use **Cloud SQL Auth Proxy** as a sidecar container (or separate container in the same compose) so that the server connects to `127.0.0.1:5432` (or `cloud-sql-proxy:5432`) with IAM-based auth and encrypted connection. Terraform would grant the E2’s service account `roles/cloudsql.client`.
- **Simpler short-term:** Connect directly to Cloud SQL public IP with `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_*`, and add the E2’s public IP (or NAT) to Cloud SQL authorized networks. Less secure; acceptable for staging only.

Env vars for the server (see run-build doc): `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and optionally `POSTGRES_URL`. If using the proxy, `POSTGRES_HOST` would be the proxy service name and port 5432.

### 5.2 Memorystore Redis

- **Terraform outputs:** `redis_host`, `redis_port` from the openthrottle module. Redis is in the same VPC; E2 can reach it by private IP.
- **Env for server:** `REDIS_HOST=<redis_host>`, `REDIS_PORT=<redis_port>` (no container for Redis on E2; use managed Memorystore).

### 5.3 App identity, CORS, API URL

- **openthrottle-server:** `APP_URL` = `https://api.<domain>`; `CORS_ORIGINS` must include `https://developer.<domain>` (and any other front-end origins). JWT, Stripe, GitHub token, etc. from env or secrets.
- **openthrottle-developer:** `API_URI` / `API_URL` / `API_URL_WEBSOCKET` = `https://api.<domain>` (so the browser talks to the same host as the user, via Caddy). `APP_URL` = `https://developer.<domain>`.

### 5.4 Where env comes from

- **Option A:** Terraform writes an `.env` (or env file) onto the E2 via **startup script** (e.g. `echo "REDIS_HOST=..." >> /opt/openthrottle/.env`) using Terraform templatefile with outputs. Compose uses `env_file: - .env`.
- **Option B:** Terraform stores minimal config in **instance metadata** (e.g. `openthrottle_env`); startup script reads it and writes the env file before `docker compose up`.
- **Option C:** Use **Secret Manager** and have the startup script or a small bootstrap container fetch secrets and write env file; Terraform grants the E2 service account access to those secrets.

Recommendation: **Option A or B** for initial wiring (Terraform outputs → startup script → env file); Option C when moving secrets (JWT, DB password) off plain env.

---

## 6. Health checks and restart policy

### 6.1 Restart policy

- All app and proxy containers: **`restart: unless-stopped`**. So on VM reboot or Docker daemon restart, containers come back without manual intervention.

### 6.2 Healthchecks (Docker)

- **openthrottle-server:** `healthcheck` in Compose (e.g. `curl -f http://localhost:3000/health` or GraphQL `GET /graphql` if a health route exists). Interval e.g. 30s; start_period 40s.
- **openthrottle-developer:** Optional `healthcheck` (e.g. `curl -f http://localhost:3000/`). Same idea.
- **Caddy:** Optional; Caddy’s default behavior is sufficient. Can add a `healthcheck` to `localhost:80` or `localhost:443` if desired.

These allow Docker to mark containers unhealthy and optionally restart them; also usable by an external load balancer if later we put a load balancer in front of the E2.

### 6.3 Caddy → backend health

- Caddy can use **active health checks** (e.g. `reverse_proxy ... with health_uri /health`) so it only sends traffic to healthy backends. Depends on server (and optionally developer) exposing a health endpoint.

---

## 7. Summary table

| Topic              | Decision                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| **Host ports**     | 80, 443 only (reverse proxy).                                                                        |
| **Internal ports** | Server 3000, developer 3000 (or PORT); Caddy 80/443.                                                 |
| **Reverse proxy**  | Caddy in container; host-based routing (api._, developer._); TLS via Let’s Encrypt or self-signed.   |
| **Orchestration**  | Docker Compose (server + developer + Caddy).                                                         |
| **Postgres**       | Cloud SQL; prefer Auth Proxy sidecar; else direct with authorized networks.                          |
| **Redis**          | Memorystore; env from Terraform outputs.                                                             |
| **Env source**     | Startup script (Terraform templatefile) writing env file for Compose; optional Secret Manager later. |
| **Restart**        | `restart: unless-stopped` for all containers.                                                        |
| **Health**         | Compose healthchecks on server (and optionally developer); Caddy optional health checks to backends. |

---

## 8. Terraform deploy wiring

The **openthrottle application module** (`infra/applications/openthrottle`) wires deploy when `deploy_enabled = true`:

- **Firewall:** `google_compute_firewall.openthrottle_allow_http_https` allows ingress tcp 80, 443 to instances with tag `openthrottle-http`.
- **IAM:** The default Compute Engine service account is granted `roles/artifactregistry.reader` so the E2 instance can pull images.
- **E2 instance:** Tagged `openthrottle-http` and given a **startup script** (see `templates/startup.sh.tpl`) that:
  1. Installs Docker and Docker Compose plugin (and Google Cloud SDK if missing).
  2. Writes `/opt/openthrottle/.env` from Terraform outputs (Postgres, Redis, APP_URL, CORS_ORIGINS, API_URI, etc.).
  3. Writes `/opt/openthrottle/Caddyfile` and `docker-compose.yml` from Terraform templates.
  4. Runs `gcloud auth configure-docker <registry>` and `docker compose up -d`.

Required variables when `deploy_enabled = true`: `server_image`, `developer_image` (full image URLs), plus `api_domain`, `developer_domain`, `postgres_*`, and optionally `artifact_registry_region`, `caddy_image`. See `infra/applications/openthrottle/variables.tf` and `infra/applications/openthrottle/README.md`.

---

## 9. References

- Current run/build and Docker usage: [run-build-and-docker-current-state.md](./run-build-and-docker-current-state.md).
- Image build and registry: [docker-image-build-strategy.md](./docker-image-build-strategy.md).
- Local Caddy config: [tools/caddy/](../../tools/caddy/), [docs/monorepo/local-services-and-ports.md](../monorepo/local-services-and-ports.md).
- Infra: `infra/applications/openthrottle/main.tf`, `infra/modules/gcp_compute_e2/`.
