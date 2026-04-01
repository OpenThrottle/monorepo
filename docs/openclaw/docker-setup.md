# OpenClaw — Docker setup

Clone location and Docker requirements for running OpenClaw in Docker. Full install guide: [docs.clawd.bot/install/docker](https://docs.clawd.bot/install/docker).

## Clone

```bash
git clone https://github.com/openclaw/openclaw.git
```

In this monorepo the clone lives at **`repositories/openclaw`** (shallow clone used for setup).

## Requirements

- **Docker:** Docker Desktop or Docker Engine
- **Docker Compose:** v2 (e.g. `docker compose` subcommand)
- Enough disk for images and logs

Verify:

```bash
docker --version
docker compose version
```

## Quick start (from OpenClaw repo root)

From `repositories/openclaw` (or your own clone):

```bash
./docker-setup.sh
```

The script:

- Builds the gateway image
- Runs the onboarding wizard
- Starts the gateway via Docker Compose
- Writes the gateway token to `.env`

Then open **http://127.0.0.1:18789/** and paste the token in Settings.

Config/workspace on host:

- `~/.openclaw/`
- `~/.openclaw/workspace`

## Run Docker setup (containerized gateway)

From this monorepo, from the OpenClaw repo root:

```bash
cd repositories/openclaw
./docker-setup.sh
```

The script will:

1. Build the gateway image
2. Run the **onboarding wizard** (interactive — complete it in the terminal)
3. Start the gateway via Docker Compose
4. Write the gateway token to `repositories/openclaw/.env`

After it finishes:

- Open **http://127.0.0.1:18789/** in your browser
- Paste the token into the Control UI (Settings → token)

Config/workspace on the host: `~/.openclaw/` and `~/.openclaw/workspace`.

## Channel setup (WhatsApp / Telegram / Discord)

Use the CLI container to add and log in to channels. From the OpenClaw repo root (`repositories/openclaw`):

**WhatsApp (QR login):**

```bash
docker compose run --rm openclaw-cli channels login
```

Follow the prompts; scan the QR with WhatsApp. See [docs.clawd.bot/channels/whatsapp](https://docs.clawd.bot/channels/whatsapp).

**Telegram or Discord (token):**

```bash
docker compose run --rm openclaw-cli channels add --channel telegram --token "<your-bot-token>"
docker compose run --rm openclaw-cli channels add --channel discord --token "<your-bot-token>"
```

See [docs.clawd.bot/channels/telegram](https://docs.clawd.bot/channels/telegram) and [docs.clawd.bot/channels/discord](https://docs.clawd.bot/channels/discord).

Restart the gateway if needed so it picks up new channels (e.g. `docker compose restart` in the repo root).

## Next steps

- [Harden security](./security-baseline.md) — audit and baseline (loopback bind, token auth, perms)
- [docs.clawd.bot/install/docker](https://docs.clawd.bot/install/docker) — optional mounts, health check, sandbox
