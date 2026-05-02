# OpenClaw

- [OAuth](https://console.cloud.google.com/apis/credentials?project=openthrottle-staging) (staging)
- Templates - https://docs.openclaw.ai/reference/templates/IDENTITY
- `echo $OPENCLAW_CONFIG_DIR`
- OpenRouter - https://docs.openclaw.ai/concepts/models#scanning-openrouter-free-models

**Startup:**

```bash
# 📂 From our OpenClaw installation
cd services/openclaw

docker compose up -d
docker compose exec -it openclaw-gateway bash

openclaw dashboard
```

```bash
# 📂 From our OpenClaw installation
cd services/openclaw

# 🧩 Add a new skill
docker compose run --rm openclaw-cli skills install [skill-name]
# docker compose run --rm openclaw-cli skills install luccast/gogcli
# docker compose run --rm openclaw-cli install luccast/gogcli

# 🤖 Update all software
git pull
docker compose pull
docker compose up -d --build
```

```bash
# SSH into the box
docker compose exec -it openclaw-gateway bash

# Rebuild the image
docker build .
```

## Installing Goggle CLI

```bash
# Enter the container
docker compose exec -it openclaw-gateway bash

# Link the credentials
gog auth credentials /home/node/.config/gogcli/credentials.json

# Start the interactive login
gog auth add matthew.scholta@gmail.com --services gmail
gog auth add matthew.scholta@gmail.com --services calendar

gog auth add matthew.scholta@gmail.com --services gmail --help
gog auth add matthew.scholta@gmail.com --services gmail --remote
gog auth add matthew.scholta@gmail.com --services calendar --remote
```

```bash
# Enter the container
docker compose exec -it openclaw-gateway bash

gog gmail messages search Github
```

## TEMP STUFF

```bash
==> Docker gateway defaults
Control UI allowlist already configured; leaving gateway.controlUi.allowedOrigins unchanged.
 Container openclaw-openclaw-gateway-run-c2943c632afc Creating
 Container openclaw-openclaw-gateway-run-c2943c632afc Created
Config overwrite: /home/node/.openclaw/openclaw.json (sha256 afd1faf99fc53ee8f9361ca3c8bdfbc2a15bc33efb15a315c8f83a58c1da5d33 -> 6628e979f536b41058685d0e253ffbc92704a784d67cd63398d1f55f675a7fb0, backup=/home/node/.openclaw/openclaw.json.bak)
Pinned gateway.mode=local and gateway.bind=lan for Docker setup.

==> Provider setup (optional)
WhatsApp (QR):
  docker compose -f /Users/matt/Development/openthrottle/services/openclaw/docker-compose.yml run --rm openclaw-cli channels login
Telegram (bot token):
  docker compose -f /Users/matt/Development/openthrottle/services/openclaw/docker-compose.yml run --rm openclaw-cli channels add --channel telegram --token <token>
Discord (bot token):
  docker compose -f /Users/matt/Development/openthrottle/services/openclaw/docker-compose.yml run --rm openclaw-cli channels add --channel discord --token <token>
Docs: https://docs.openclaw.ai/channels

==> Starting gateway
[+] up 1/1
 ✔ Container openclaw-openclaw-gateway-1 Started                                                                                                                0.6s
 Container openclaw-openclaw-gateway-1 Running
 Container openclaw-openclaw-cli-run-018902c03402 Creating
 Container openclaw-openclaw-cli-run-018902c03402 Created
Config overwrite: /home/node/.openclaw/openclaw.json (sha256 6628e979f536b41058685d0e253ffbc92704a784d67cd63398d1f55f675a7fb0 -> 6a1a38990eecb23f09f7f51acc8d95141ffafd407cc4981a1acd4a75dc57cfd0, backup=/home/node/.openclaw/openclaw.json.bak)

Gateway running with host port mapping.
Access from tailnet devices via the host's tailnet IP.
Config: /Users/matt/.openclaw
Workspace: /Users/matt/.openclaw/workspace
Token: "***REMOVED-OPENCLAW-TOKEN***"

Commands:
  docker compose -f /Users/matt/Development/openthrottle/services/openclaw/docker-compose.yml logs -f openclaw-gateway
  docker compose -f /Users/matt/Development/openthrottle/services/openclaw/docker-compose.yml exec openclaw-gateway node dist/index.js health --token ""***REMOVED-OPENCLAW-TOKEN***""
```
