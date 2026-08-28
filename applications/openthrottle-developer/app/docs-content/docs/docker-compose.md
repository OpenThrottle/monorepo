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
