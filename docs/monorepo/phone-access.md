# Phone access

How to open OpenThrottle from a phone — anywhere, cellular included — against the local stack on
your Mac and against the deployed box. These decisions were made on 2026-10-25 (OT plan `fb96d4e4`);
this page is the record of them, not a proposal.

## Audience and threat model

**One person: the owner of the install.** Not a team, not guests. Opening either target to other
people later is a separate, deliberate step with its own review.

The reason that matters: the developer app runs agent CLIs that have a shell on the machine they run
on. Anyone who can reach a logged-in developer UI can, in effect, run commands on the host. Every
rule below follows from treating the developer app as a remote shell:

- **Local** has no second factor on agents, so the network is its only protection — it is reachable
  only over a private network you control.
- **Deployed** is reachable from the public internet, so login is rate-limited and agent execution
  needs a recently used passkey (OT plan `dca68585`).

## The rule: no public tunnels to a local stack, ever

**Do not expose a local stack through ngrok, Cloudflare Tunnel, `tailscale funnel`, a router port
forward, or anything else that gives it a public URL.** Not briefly, not for a demo.

The local stack does not enforce the passkey gate (`AUTH_AGENTS_REQUIRE_PASSKEY` is off locally), so
a public URL to it is a public URL to a shell on your Mac guarded by one password.

## Local: a private network plus one HTTPS forward

The phone joins a private network (a Tailscale tailnet, for now). `tailscale serve` gives the Mac an
HTTPS address on that network — `https://<mac>.<tailnet>.ts.net` — and forwards it to the developer
app's port. That is all Tailscale does.

HTTPS is not optional: the microphone (voice input), the service worker (PWA install) and the
clipboard all require a secure context, so a plain `http://<lan-ip>:6020` URL breaks them even on the
same Wi-Fi.

### Why Tailscale is kept swappable

Tailscale supplies exactly two things: **the private network** and **the certificate**. All routing
lives in our own stack (see [One origin](#one-origin-the-browser-calls-api)), so replacing Tailscale
means replacing one port forward and nothing else. Everything Tailscale-specific lives in one script.

If the third party ever has to go, the exit is **Headscale** (a self-hosted Tailscale control
server): same clients, same `serve` behaviour, our own coordination server.

## One origin: the browser calls `/api`

The browser reaches the API at `/api/...` on **the page's own origin**, never at a second absolute
address. Before this, the browser called `http://localhost:6021` directly — and on a phone,
`localhost` is the phone.

| Target   | Who routes `/api`                                                                         |
| -------- | ----------------------------------------------------------------------------------------- |
| Local    | The Vite dev server proxies `/api` (including the graphql-ws upgrade) to the server port. |
| Deployed | The developer domain's Caddy block: `handle_path /api/*` → `openthrottle-server`.         |

One origin also means no CORS for the browser, cookies scoped to a single host, and a CSP whose
`connect-src` is `'self'`. `api.openthrottle.ai` and the MCP domain stay up for non-browser clients.

## Deployed: public, with two gates

The deployed box stays on the public internet; there is no Tailscale on it and the firewall is
unchanged.

- **The DNS cutover waited only on login rate limiting plus cookie checks**, which are now in place:
  - **Per client IP:** `login` and `register` allow 10 attempts a minute, then block that IP for five
    minutes; `mintSubscriptionToken` (behind `/auth/ws-token`) allows 60 a minute. The server keys on
    `req.ip`, made the real client by `trust proxy` for private-network peers (`TRUST_PROXY`), and the
    developer app forwards the visitor's `X-Forwarded-For` on its server-side calls.
  - **Per account:** five free failures, then the account locks for 30s, doubling to 15 minutes,
    whatever IPs the guesses come from. A success clears it.
  - **Cookies:** production auth cookies are always `Secure; HttpOnly; SameSite=Lax`, and passing
    `insecureCookies` under `NODE_ENV=production` throws.
  - **Bootstrap credentials:** in production `bootstrap` refuses to run without a non-default
    `OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD` and rotates a user still on the default, and login refuses
    the public default password outright.
- **Production agents wait on passkeys** (OT plan `dca68585`): an `agents:run` permission (admin
  only), a passkey used within the last 24 hours, several passkeys per account, and an SSH-run reset
  command. Production `agents_enabled` stays off until that ships.

## Rejected options

| Option                                   | Why not                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| LAN IP (`http://192.168.x.x:6020`)       | Home Wi-Fi only, and no secure context — mic, service worker and clipboard all fail.                               |
| Public tunnel (ngrok, Cloudflare Tunnel) | Puts an unguarded remote shell on the internet. See [the rule](#the-rule-no-public-tunnels-to-a-local-stack-ever). |
| Cloudflare Access in front of a tunnel   | Still a public tunnel, plus a second identity provider to trust and keep configured.                               |
| Plain WireGuard                          | Works, but we would hand-manage keys, DNS and certificates that Tailscale gives us for free.                       |
| Tailnet-only deployed box                | Rejected by choice: the deployed box should be reachable without a VPN client on every device.                     |
| Routing inside Tailscale (`--set-path`)  | Moves routing into the third party, which is exactly what keeps Tailscale from being swappable.                    |
| Keeping two origins (UI + `api.`)        | Needs CORS, cross-site cookies and an absolute API URL baked per environment — the thing that broke phones.        |

## Setup

Once per machine:

1. **Install Tailscale on the Mac and on the phone** (<https://tailscale.com/download>) and sign in to
   the same tailnet on both. On the phone, keep the VPN toggle on — it is what makes the address
   resolve over cellular.
2. **In the tailnet admin console → DNS, enable MagicDNS and HTTPS Certificates.** Without them
   there is no `*.ts.net` name and no certificate, and `remote:serve` stops with a message saying
   so.

Each time you want phone access:

1. Start the stack as usual (`pnpm nx run openthrottle-server:dev`,
   `pnpm nx run openthrottle-developer:dev`).
2. Run `pnpm run remote:serve`. It forwards `https://<mac>.<tailnet>.ts.net` (port 443) to the
   developer app's port — `PORT` in `applications/openthrottle-developer/.env`, so a worktree
   forwards its own app — and prints the URL.
3. **First time only:** add the printed hostname to `applications/openthrottle-developer/.env` and
   restart the dev server. Vite refuses hostnames it has not been told about, and `remote:serve`
   reminds you when it is missing:

   ```bash
   DEV_ALLOWED_HOSTS="mac.tail1234.ts.net"
   ```

4. Open the URL on the phone. `pnpm run remote:stop` removes the forward.

What makes it work, and what does not need configuring:

- **The API is already on the same origin.** `API_URL_EXTERNAL="/api"` is the dev default, so the
  phone calls `https://<mac>.<tailnet>.ts.net/api/...`, which the Vite dev server proxies to the
  server. An older `.env` with an absolute `API_URL_EXTERNAL` breaks the phone; `remote:serve` warns
  about it.
- **HMR needs nothing.** Vite's HMR client connects to the page's own origin, so behind the HTTPS
  forward it uses `wss://<host>` on 443 by itself. Pinning `server.hmr.clientPort` to 443 would
  break plain `localhost` instead.
- **Cookies get `Secure` over the forward.** In local dev the auth cookie is `Secure` whenever the
  browser reached the app over https (directly or through a proxy's `X-Forwarded-Proto`), and stays
  off for plain `http://localhost`.

Everything Tailscale-specific lives in `scripts/remote-serve.ts`. To swap the provider, change that
file; nothing else knows Tailscale exists.

## Recovery

_To be written with passkey-gated agents (OT plan `dca68585`): registering more than one passkey, and
the SSH-run reset when every passkey is lost._

## References

- [local-services-and-ports.md](./local-services-and-ports.md) — the port map and the existing
  path-based Caddy layout (`tools/caddy/Caddyfile.path-based`) this design mirrors.
- [PWA.md](./PWA.md) — the manifest and install behaviour.
- `infra/applications/openthrottle_hcloud/templates/Caddyfile.tpl` — the deployed Caddy config.
