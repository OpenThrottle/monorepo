---
description: Run the OpenThrottle apps and dependencies with Docker Compose.
group: 02. Development
order: 1
title: 'Docker Compose'
---

## 🐳 Docker Compose

OpenThrottle has been built to sit next to, on-top, or around your existing architecture. We hope to layer on tools and workflows that accelerate and sharpen the quality of each and release.

**Development Workflow:**

```bash
docker compose up openthrottle-server --build
docker compose up openthrottle-developer --build

docker images | grep openthrottle
```

**Publishing Images (manually):**

```bash
OPENTHROTTLE_DRY_RUN=1 pnpm run gcs:docker-upload
```

**Chat image uploads (persistent volume):**

Images attached in chat are stored as files, not in Postgres, under `OPENTHROTTLE_ATTACHMENTS_DIR` (default `~/.openthrottle/attachments`). In a container that home directory is ephemeral, so the directory must be a persistent volume or bind mount, or every uploaded image is lost when the container is recreated. The self-host compose file (`applications/openthrottle/docker-compose.yml`) points it at `/host-openthrottle/attachments`, inside the bind-mounted host `~/.openthrottle`. A hardened deployment with a read-only root filesystem (such as the Hetzner template) must mount a writable volume there and set `OPENTHROTTLE_ATTACHMENTS_DIR` to it. Files nothing references are deleted daily after `OPENTHROTTLE_ATTACHMENTS_RETENTION_DAYS` days (default 30).
