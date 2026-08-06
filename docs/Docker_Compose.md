# 🐳 Docker Compose

```bash
docker compose up openthrottle-server --build
docker compose up openthrottle-developer --build

docker images | grep openthrottle
```

**Publishing Images (manually):**

```bash
OPENTHROTTLE_DRY_RUN=1 ./scripts/gcs-docker-upload.sh
```

**Docker Hub:**

```bash
docker push openthrottle/developer:latest
docker push openthrottle/server:latest
docker push openthrottle/migrations:latest
```
