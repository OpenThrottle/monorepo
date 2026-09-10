#!/usr/bin/env bash
#
# Enforces the shared provider contract in infra/provider-contract.md.
#
# The contract's claim is that an environment can switch hosting providers by
# changing which application module it calls (ladder rung 4). That only holds if
# variables meaning the same thing on both providers are spelled and typed
# identically. This script checks exactly that, so the claim cannot rot:
#
#   1. The set of variables present in BOTH application modules is exactly the
#      documented shared set — no accidental additions, no silent removals.
#   2. Those shared variables have identical `type` on both sides.
#   3. Every provider-specific variable is listed in provider-contract.md, so a
#      new one cannot appear without being documented as intentional.
#
# Dependency-free (bash + awk) on purpose: infra/ has no Nx targets and no
# node_modules, and this must run in CI next to `terraform validate`.
#
# Usage, from the repo root:
#   infra/tests/contract/check-provider-contract.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GCP_VARS="${ROOT}/infra/applications/openthrottle/variables.tf"
HCLOUD_VARS="${ROOT}/infra/applications/openthrottle_hcloud/variables.tf"
CONTRACT="${ROOT}/infra/provider-contract.md"

for f in "${GCP_VARS}" "${HCLOUD_VARS}" "${CONTRACT}"; do
  if [[ ! -f "${f}" ]]; then
    echo "::error::missing required file: ${f}"
    exit 1
  fi
done

# The documented shared set. Changing this list is a deliberate contract change:
# update provider-contract.md's "Shared" table in the same commit.
SHARED_EXPECTED=$(
  cat <<'EOF'
api_domain
caddy_image
deploy_enabled
developer_domain
developer_image
env_name
postgres_db_name
postgres_password
postgres_user
server_image
EOF
)

# Emit "<name> <type>" per variable block. Takes the FIRST `type =` inside each
# block, so a nested type expression cannot be mistaken for the next variable's.
extract() {
  awk '
    /^variable "/ {
      name = $2; gsub(/"/, "", name); have_type = 0; next
    }
    name != "" && !have_type && /^[[:space:]]*type[[:space:]]*=/ {
      line = $0
      sub(/^[[:space:]]*type[[:space:]]*=[[:space:]]*/, "", line)
      print name, line
      have_type = 1
    }
    /^}/ { name = ""; have_type = 0 }
  ' "$1" | sort
}

extract "${GCP_VARS}" > /tmp/ot-contract-gcp.txt
extract "${HCLOUD_VARS}" > /tmp/ot-contract-hcloud.txt

cut -d' ' -f1 /tmp/ot-contract-gcp.txt > /tmp/ot-contract-gcp-names.txt
cut -d' ' -f1 /tmp/ot-contract-hcloud.txt > /tmp/ot-contract-hcloud-names.txt

comm -12 /tmp/ot-contract-gcp-names.txt /tmp/ot-contract-hcloud-names.txt > /tmp/ot-contract-both.txt
printf '%s\n' "${SHARED_EXPECTED}" | sort > /tmp/ot-contract-expected.txt

status=0

# --- 1. shared set matches the contract ------------------------------------
if ! diff -u /tmp/ot-contract-expected.txt /tmp/ot-contract-both.txt > /tmp/ot-contract-diff.txt; then
  echo "::error::the set of variables shared by both application modules does not match the documented shared set."
  echo "  (-) documented in provider-contract.md but no longer shared; (+) shared but undocumented"
  sed -n '3,$p' /tmp/ot-contract-diff.txt | sed 's/^/    /'
  echo "  Fix: update provider-contract.md's Shared table AND SHARED_EXPECTED in this script together."
  status=1
else
  echo "ok: shared variable set matches the contract ($(wc -l < /tmp/ot-contract-both.txt | tr -d ' ') variables)"
fi

# --- 2. shared variables have identical types ------------------------------
type_mismatch=0
while IFS= read -r name; do
  [[ -z "${name}" ]] && continue
  gcp_type="$(awk -v n="${name}" '$1 == n { $1 = ""; sub(/^ /, ""); print }' /tmp/ot-contract-gcp.txt)"
  hcloud_type="$(awk -v n="${name}" '$1 == n { $1 = ""; sub(/^ /, ""); print }' /tmp/ot-contract-hcloud.txt)"
  if [[ "${gcp_type}" != "${hcloud_type}" ]]; then
    echo "::error::shared variable ${name} has different types: GCP '${gcp_type}' vs hcloud '${hcloud_type}'"
    type_mismatch=1
  fi
done < /tmp/ot-contract-both.txt

if [[ "${type_mismatch}" -eq 0 ]]; then
  echo "ok: all shared variables have identical types"
else
  echo "  A shared variable whose type differs breaks ladder rung 4 — an environment cannot pass the same value to both modules."
  status=1
fi

# --- 3. provider-specific variables are documented -------------------------
# A variable is "documented" when its name appears in a backtick-quoted span in
# provider-contract.md. Deliberately loose: the goal is that nobody adds a
# provider-specific variable without mentioning it, not to police table layout.
undocumented=0
for side in gcp hcloud; do
  if [[ "${side}" == "gcp" ]]; then
    comm -23 /tmp/ot-contract-gcp-names.txt /tmp/ot-contract-hcloud-names.txt > /tmp/ot-contract-only.txt
  else
    comm -13 /tmp/ot-contract-gcp-names.txt /tmp/ot-contract-hcloud-names.txt > /tmp/ot-contract-only.txt
  fi
  while IFS= read -r name; do
    [[ -z "${name}" ]] && continue
    if ! grep -q "\`${name}\`" "${CONTRACT}"; then
      echo "::error::${side}-only variable '${name}' is not mentioned in provider-contract.md."
      echo "  Provider-specific variables must be listed as such, never left to be mistaken for shared."
      undocumented=1
    fi
  done < /tmp/ot-contract-only.txt
done

if [[ "${undocumented}" -eq 0 ]]; then
  echo "ok: every provider-specific variable is documented in provider-contract.md"
else
  status=1
fi

rm -f /tmp/ot-contract-*.txt

if [[ "${status}" -eq 0 ]]; then
  echo "provider contract: OK"
else
  echo "provider contract: FAILED"
fi
exit "${status}"
