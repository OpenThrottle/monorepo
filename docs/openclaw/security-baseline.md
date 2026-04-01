# OpenClaw — Security baseline (audit and hardening)

Run the security audit and apply a secure baseline. Full guide: [docs.clawd.bot/security](https://docs.clawd.bot/security).

## 1. Run security audit

From the OpenClaw repo root (`repositories/openclaw`), run the audit via the CLI container:

```bash
cd repositories/openclaw
docker compose run --rm openclaw-cli security audit
docker compose run --rm openclaw-cli security audit --deep
docker compose run --rm openclaw-cli security audit --fix
```

- **`audit`** — flags common footguns (Gateway auth, browser control, elevated allowlists, filesystem permissions).
- **`--deep`** — adds a best-effort live Gateway probe.
- **`--fix`** — applies safe guardrails: tighten group policies, redact logging, tighten local file permissions.

If the gateway is running on the host (not only in Docker), you can also run `openclaw security audit` (and `--deep`, `--fix`) after installing the CLI.

## 2. Secure baseline (config)

Apply a minimal safe default: loopback bind, token auth, DM pairing, groups require mention.

Example (merge into your config, e.g. `~/.openclaw/openclaw.json` or via `openclaw config set`):

```json5
{
  gateway: {
    mode: 'local',
    bind: 'loopback',
    port: 18789,
    auth: { mode: 'token', token: 'your-long-random-token' },
  },
  channels: {
    whatsapp: {
      dmPolicy: 'pairing',
      groups: { '*': { requireMention: true } },
    },
  },
}
```

- **gateway.bind: "loopback"** — only local clients can connect.
- **gateway.auth** — token (or password) required; use `OPENCLAW_GATEWAY_TOKEN` or generate with `openclaw doctor --generate-gateway-token`.
- **channels.\*** **dmPolicy: "pairing"** — unknown DMs get a pairing code; approve with `openclaw pairing approve <channel> <code>`.
- **channels.\*** **groups.\*.requireMention: true** — groups only respond when mentioned.

Repeat `dmPolicy` and `groups` for other channels (Telegram, Discord, Slack, etc.) as needed.

## 3. Lock `~/.openclaw` permissions

Keep config and state private on the gateway host:

- **`~/.openclaw`** → `700` (directory; user only)
- **`~/.openclaw/openclaw.json`** (or main config file) → `600` (user read/write only)

```bash
chmod 700 ~/.openclaw
chmod 600 ~/.openclaw/openclaw.json
```

`openclaw security audit --fix` can tighten these and other state files (e.g. `credentials/*.json`, `agents/*/agent/auth-profiles.json`).

## 4. Optional: restrict network and discovery

When exposing the gateway beyond loopback, tighten network and discovery to reduce attack surface.

- **Beyond loopback:** Prefer **Tailscale Serve** instead of binding to LAN (no open ports on the host). If you must bind to LAN, use a firewall and keep token auth enabled.
- **mDNS/Bonjour:** Reduce information disclosure by disabling or limiting discovery:
  - Env (Docker or host): `OPENCLAW_DISABLE_BONJOUR=1`
  - Config: `discovery.mdns.mode: "minimal"` or `"off"` in `~/.openclaw/openclaw.json`
- **Reverse proxy:** If the gateway sits behind nginx, Caddy, or Traefik, set `gateway.trustedProxies` to the proxy’s IP/CIDR and keep auth enabled so only the proxy can reach the gateway.

Example config snippet:

```json5
{
  discovery: { mdns: { mode: 'off' } },
  gateway: {
    trustedProxies: ['127.0.0.1', '::1'],
    // add your proxy IP or CIDR, e.g. "172.18.0.0/24" for Docker bridge
  },
}
```

## 5. Optional: agent sandbox

Run tool execution inside Docker containers to reduce blast radius. The gateway stays on the host; only tool runs are isolated. Full guide: [docs.clawd.bot/gateway/sandboxing](https://docs.clawd.bot/gateway/sandboxing).

### Enable sandbox and build image

1. **Build the sandbox image** (from the OpenClaw repo root, e.g. `repositories/openclaw`):

   ```bash
   cd repositories/openclaw
   ./scripts/sandbox-setup.sh
   ```

   This produces `openclaw-sandbox:bookworm-slim`. Optional: build the sandbox browser image with `./scripts/sandbox-browser-setup.sh`.

2. **Enable sandbox in config** — set `agents.defaults.sandbox` with mode and scope. Example (merge into `~/.openclaw/openclaw.json` or use `openclaw config set`):

   ```json5
   {
     agents: {
       defaults: {
         sandbox: {
           mode: 'non-main',
           scope: 'agent',
           workspaceAccess: 'none',
         },
       },
     },
   }
   ```

   - **mode:** `"off"` | `"non-main"` | `"all"`. Use `"non-main"` so only non-main sessions (e.g. groups, other channels) run in the sandbox; main chat stays on host.
   - **scope:** `"session"` | `"agent"` | `"shared"`. Use `"agent"` for one container per agent.
   - **workspaceAccess:** `"none"` (default), `"ro"`, or `"rw"`. Use `"none"` or `"ro"` for untrusted agents; `"rw"` only if the agent must write to the workspace.

### Restrict tools and workspace

- **Tool allow/deny:** Use agent-level or global tool policy to allow/deny which tools can run. Restrict elevated or risky tools for sandboxed agents.
- **workspaceAccess:** Keep `none` or `ro` for untrusted agents so the sandbox cannot write to the agent workspace; with `ro`, tools can read from `/agent` but not write.

Sandboxed browser, custom bind mounts, and `setupCommand` are documented at [docs.clawd.bot/gateway/sandboxing](https://docs.clawd.bot/gateway/sandboxing).

## References

- [docs.clawd.bot/security](https://docs.clawd.bot/security) — full security guide, threat model, hardening examples.
- [Docker setup](./docker-setup.md) — clone, run gateway, then return here for audit and baseline.
