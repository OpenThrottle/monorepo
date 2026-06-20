# Infra tests

Static tests for the Terraform under `infra/`. There is no live `apply`; these
gates run on configuration only, so they need no GCP/Cloudflare credentials.

The same gates run in CI via
[`.github/workflows/terraform-validate.yml`](../../.github/workflows/terraform-validate.yml)
on any change under `infra/**`.

## Gates

| Gate                 | Tool                | What it catches                                                          |
| -------------------- | ------------------- | ------------------------------------------------------------------------ |
| `terraform fmt`      | Terraform           | Formatting drift.                                                        |
| `terraform validate` | Terraform           | Syntax, references, provider-schema errors (per root, `-backend=false`). |
| `tfsec`              | tfsec               | Broad static security misconfiguration scan.                             |
| Conftest policies    | Conftest / OPA Rego | OpenThrottle-specific security invariants (see `policy/security.rego`).  |

The Conftest policies in [`policy/security.rego`](policy/security.rego) encode the
specific issues from the infra audit so a regression fails CI:

1. Cloud SQL must not use `ssl_mode = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"`.
2. Cloud SQL `authorized_networks` must not include `0.0.0.0/0`.
3. A Terraform **state** bucket (`*-terraform-state`) must enable object versioning.
4. Storage buckets must set `uniform_bucket_level_access = true`.

## Layout

- `policy/security.rego` — the policies.
- `policy/security_test.rego` — Rego unit tests run by `conftest verify`.
- `fixtures/cloud_sql_postgres_secure/` — a secure module-usage example that
  doubles as a `terraform validate` smoke target and a policy fixture that MUST pass.

## Run locally

Install Conftest (`brew install conftest`) and Terraform, then from the repo root:

```bash
# Validate every Terraform root (per-root, no backend credentials).
for dir in $(find infra -type f -name '*.tf' -exec dirname {} \; | sort -u); do
  terraform -chdir="$dir" init -backend=false -input=false
  terraform -chdir="$dir" validate
done

# Unit-test the policies against their own fixtures.
conftest verify --policy infra/tests/policy

# Run the policies over the real Terraform roots + the example fixture.
conftest test --policy infra/tests/policy \
  infra/environments infra/modules infra/applications infra/tests/fixtures
```
