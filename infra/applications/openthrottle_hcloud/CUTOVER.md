# DNS and TLS cutover, and verifying the public surface

Runbook for pointing `api_domain` / `developer_domain` at the Hetzner box, letting Caddy issue
certificates, and then proving what the box actually exposes.

Verification is a script, not a checklist:

```bash
API_DOMAIN=api.openthrottle.ai \
DEVELOPER_DOMAIN=developer.openthrottle.ai \
SERVER_IP=<ipv4_address output> \
  infra/tests/exposure/verify-exposure.sh
```

## ⚠️ Establish the rollback target FIRST

The plan assumes rollback is "a DNS change back to the GCP deployment, which stays running." **That
target may not exist.** The GCP application composition is commented out in
`environments/staging/openthrottle.tf` (`STATUS: NOT ACTIVE`) and absent from `production` — it has
never been applied, so there is no GCP endpoint serving these hostnames. See
[`../../hetzner-topology.md`](../../hetzner-topology.md).

So before touching a record, answer: **what serves `api_domain` and `developer_domain` right now?**

- **Nothing** — then this is a first launch, not a cutover. There is no rollback, and the risk is
  simply that the new box does not work. Proceed, but do not tell yourself you have a fallback.
- **Something else** (Vercel, an older host) — then _that_ is the rollback target, not GCP. Record it
  exactly, per the next section.

Getting this wrong is how a "safe, reversible" cutover turns out to have been one-way.

## 1. Record the current records, exactly

Rollback must be mechanical — retyping a value from memory during an incident is how outages get
longer.

```bash
for d in api.openthrottle.ai developer.openthrottle.ai; do
  echo "== ${d}"
  dig +noall +answer A    "${d}"
  dig +noall +answer AAAA "${d}"
  dig +noall +answer CNAME "${d}"
done | tee dns-before-cutover.txt
```

Keep `dns-before-cutover.txt`. It is the rollback procedure.

## 2. Lower the TTL, then wait for the old TTL to elapse

Do this **before** the cutover, as a separate change:

```
api.openthrottle.ai.        60  IN  A  <current ip>
developer.openthrottle.ai.  60  IN  A  <current ip>
```

Lowering the TTL only takes effect once the _previous_ TTL has expired everywhere. Changing the TTL
and the address in one edit gives you none of the benefit — resolvers still hold the old answer for
the old duration. If the previous TTL was 3600, wait an hour.

`verify-exposure.sh` reports the observed TTL and warns when it is above 300s.

## 3. Open port 80 before expecting TLS

Caddy answers the ACME **HTTP-01** challenge on port 80, and cannot serve 443 until that succeeds.
A firewall that opens only 443 leaves certificate issuance failing quietly — the site simply does not
come up, with nothing obviously wrong in the firewall.

The `hcloud_server` module opens both by default (`http_source_ips`). Confirm before cutting over:

```bash
hcloud firewall describe openthrottle-production-firewall
```

**Do not loop on failed issuance.** Let's Encrypt rate-limits failures as well as successes, and a
retry loop against a misconfigured DNS record can lock issuance out for hours. Fix the cause, then
retry once. Caddy's own backoff is already appropriate; watch it rather than restarting repeatedly:

```bash
docker compose logs -f caddy
```

## 4. Point the records at the box

```bash
terraform output ipv4_address
terraform output ipv6_address
```

Both hostnames get the **same** address — Caddy routes by hostname, so one box serves both. Add AAAA
records too if IPv6 is enabled; there is no cost and no downside.

## 5. Verify from OFF the box

```bash
API_DOMAIN=… DEVELOPER_DOMAIN=… SERVER_IP=… infra/tests/exposure/verify-exposure.sh
```

Run it from somewhere other than the server. A check run on-box would cheerfully connect to
`127.0.0.1:5432` and tell you nothing about the public surface.

Passing `SERVER_IP` matters: without it the port probes follow DNS, so a stale record has you probing
the **old** host and passing.

What it asserts:

| Check                                   | Why                                                             |
| --------------------------------------- | --------------------------------------------------------------- |
| 80 and 443 reachable                    | 80 is required for ACME, not just a redirect                    |
| **5432 and 6379 refused**               | A reachable database is an incident, not a warning              |
| TLS certificate served and matching     | Proves ACME actually completed                                  |
| `/health` 200 with all four facets `ok` | api, database, redis, websocket — the stack, not just the proxy |
| developer app 200 at `/`                | SSR is up, not merely the port                                  |

### SSH is reported, not asserted

One vantage point cannot tell "open to the world" from "open to me because my range is allowlisted",
so the script says which it observed and refuses to claim more. To actually prove SSH is scoped,
either probe from an address that should be denied, or read the rule back:

```bash
hcloud firewall describe openthrottle-production-firewall
```

This matters more here than on GCP. `gcp_compute_e2` defines no SSH rule and relies on the VPC's
default rules — **Hetzner has no such default.** `ssh_allowed_cidrs` is explicit, and the module
rejects `0.0.0.0/0` outright.

## 6. If it goes wrong

1. Restore the records from `dns-before-cutover.txt`. With a 60s TTL this takes effect in about a
   minute — which is the entire reason for step 2.
2. Leave the Hetzner box running. It costs a few euro a month and is far more useful for diagnosis
   alive than destroyed.
3. Do **not** re-trigger certificate issuance while diagnosing. See the rate-limit note in step 3.

## Known gap

None of this has been executed. The runbook and `verify-exposure.sh` were written and the script's
logic exercised locally — its port probe is verified against open, refused, and packet-dropping
targets — but no Hetzner server has been provisioned and no DNS record has been changed, so the
`/health` and TLS assertions have never run against a real deployment.
