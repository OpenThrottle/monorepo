# example-hcloud

A **complete, copyable** Hetzner environment for the OpenThrottle stack. Copy this directory, fill in
`terraform.tfvars`, and apply.

This is the deployment path for anyone outside OpenThrottle. Our own roots
(`staging/`, `production/`, `production-hcloud/`) exist alongside it and are not templates — they
carry our project IDs and hostnames.

## Quickstart

```bash
cp -r infra/environments/example-hcloud infra/environments/my-env
cd infra/environments/my-env

cp terraform.tfvars.example terraform.tfvars   # gitignored; edit it
$EDITOR versions.tf                            # choose a state backend
export HCLOUD_TOKEN=...                        # never a Terraform variable

terraform init
terraform apply
```

Then, **once** — `up` deliberately never provisions a database, because
`postgres_host` may point at a shared one:

```bash
ssh root@$(terraform output -raw ipv4_address)
cd /opt/openthrottle
OPENTHROTTLE_MCP_AUTH_TOKEN='ot_sa_…' docker compose run --rm bootstrap
```

Until that runs there is no login user and no MCP token, and the `mcp` container will not serve.
That is expected, not a failure.

## Before you apply

|                                 |                                                                                                                                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Choose a backend**            | `versions.tf` ships with none, so state is local. Fine to evaluate; not for a real deployment — state holds the generated passwords, and losing it orphans the server.                                                                 |
| **Images must exist**           | All four (`openthrottle-server`, `openthrottle-developer`, `migrations`, `mcp`) at the same `image_tag`. A migrations image from a different commit than the server is how a schema/code mismatch reaches production.                  |
| **DNS first, or expect no TLS** | Caddy answers the ACME HTTP-01 challenge on **port 80** and cannot serve 443 until it succeeds. Point DNS at `ipv4_address`, then let it issue. Let's Encrypt rate-limits _failures_, so fix the cause rather than retrying in a loop. |
| **Set `ssh_allowed_cidrs`**     | Hetzner has no default firewall rules to inherit. Empty means no SSH at all — recoverable only via the Hetzner console. `0.0.0.0/0` is rejected.                                                                                       |
| **Set `backup_remote`**         | Empty means the only copy of your data lives on the machine it is meant to protect.                                                                                                                                                    |

## What you get

One server (`cx22` by default) running Caddy, the API, the developer app, `mcp`, Postgres (pgvector
on PG18) and Redis as containers, plus a one-shot migrations runner that gates the server on a
successful schema upgrade. Caddy terminates TLS and routes by hostname. **5432 and 6379 are never
published**, and the firewall opens only 80/443 plus the SSH range you specify.

Roughly **EUR 5.39/mo** including snapshots — see [`../../hetzner-estimate.csv`](../../hetzner-estimate.csv).

## Secrets

`jwt_secret` and `postgres_password` are intentionally **not set** in `main.tf`. Left empty, the box
generates them at first boot into a root-only file, so they never enter Terraform state or cloud-init
`user_data` — which is readable through the Hetzner API for the life of the server.

With public container packages, `ghcr_username`/`ghcr_token` stay empty too, and **nothing secret
reaches `user_data` at all**. Full reasoning:
[`../../applications/openthrottle_hcloud/SECRETS.md`](../../applications/openthrottle_hcloud/SECRETS.md).

## Then what

- [`../../applications/openthrottle_hcloud/CUTOVER.md`](../../applications/openthrottle_hcloud/CUTOVER.md)
  — DNS/TLS, then verify the public surface with
  [`../../tests/exposure/verify-exposure.sh`](../../tests/exposure/verify-exposure.sh).
- [`../../../databases/SEEDING.md`](../../../databases/SEEDING.md) — load an existing dataset and
  verify it (a row count does not prove the embeddings survived).
- [`../../SCALING.md`](../../SCALING.md) — bigger box, growing the volume, moving Postgres off the
  box, or switching provider.
- [`../../HOSTING-OPTIONS.md`](../../HOSTING-OPTIONS.md) — the GCP alternative and how the two
  compare.

## A note on this root being public

The module call here is **not** commented out, unlike our `production-hcloud`. That is deliberate: it
makes `terraform validate` type-check the application module's interface in CI, so renaming a
variable fails here instead of during someone's first deploy.

It is also why `*.tfvars` is gitignored repo-wide. The structure of a deployment is safe to publish;
its **values** — your admin IPs above all — are not.
