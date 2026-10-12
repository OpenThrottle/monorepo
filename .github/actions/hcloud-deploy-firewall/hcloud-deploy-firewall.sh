#!/usr/bin/env bash
set -euo pipefail

# Composite action helper: open or close the Hetzner deploy firewall.
#
# Usage: hcloud-deploy-firewall.sh open|close
#
# Env:
#   FIREWALL_NAME  deploy firewall name (required)
#   HCLOUD_TOKEN   Hetzner Cloud API token, read/write (required)
#   RUNNER_IP      overrides IP discovery for `open` (tests)
#   HCLOUD_API     overrides the API base URL (tests)

MODE="${1:-}"
: "${FIREWALL_NAME:?}"
: "${HCLOUD_TOKEN:?}"

API="${HCLOUD_API:-https://api.hetzner.cloud/v1}"

if [[ "${MODE}" != "open" && "${MODE}" != "close" ]]; then
  echo "::error::mode must be 'open' or 'close', got '${MODE}'"
  exit 1
fi

# Hetzner resource names are [a-zA-Z0-9-_.]. Checking that here also means the
# name is safe to put in a query string without encoding.
if [[ ! "${FIREWALL_NAME}" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "::error::invalid firewall name '${FIREWALL_NAME}'"
  exit 1
fi

# --fail-with-body rather than -f, and the body echoed on failure, so a 4xx
# surfaces Hetzner's error message instead of a bare status code. Every call
# is inside $(...), where stdout would be swallowed — hence stderr.
hcloud() {
  local method="$1" path="$2" body="${3:-}" out
  local args=(
    --fail-with-body --silent --show-error --max-time 30
    -X "${method}"
    -H "Authorization: Bearer ${HCLOUD_TOKEN}"
    -H 'Content-Type: application/json'
  )
  if [[ -n "${body}" ]]; then
    args+=(--data "${body}")
  fi
  if ! out="$(curl "${args[@]}" "${API}${path}")"; then
    echo "::error::Hetzner API ${method} ${path} failed: ${out}" >&2
    return 1
  fi
  printf '%s' "${out}"
}

firewall="$(hcloud GET "/firewalls?name=${FIREWALL_NAME}")"
firewall_id="$(jq -r '.firewalls[0].id // empty' <<< "${firewall}")"

if [[ -z "${firewall_id}" ]]; then
  echo "::error::no firewall named '${FIREWALL_NAME}' in this Hetzner project. Is deploy_firewall_enabled set, and does HETZNER_DEPLOY_TOKEN belong to the right project?"
  exit 1
fi

# Opening a firewall that is attached to nothing succeeds and changes nothing,
# leaving the SSH step to time out with no hint why. Say so instead.
if [[ "${MODE}" == "open" ]] && [[ "$(jq '.firewalls[0].applied_to | length' <<< "${firewall}")" -eq 0 ]]; then
  echo "::error::firewall '${FIREWALL_NAME}' is not applied to any server, so opening it would not reach the box."
  exit 1
fi

if [[ "${MODE}" == "open" ]]; then
  ip="${RUNNER_IP:-$(curl --fail --silent --show-error --max-time 10 https://checkip.amazonaws.com | tr -d '[:space:]')}"

  # The address is about to become a firewall rule, so refuse anything that is
  # not a plain dotted IPv4 rather than trusting the lookup service's output.
  if [[ ! "${ip}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    echo "::error::could not determine this runner's public IPv4 (got '${ip}')"
    exit 1
  fi

  rules="$(jq -cn --arg cidr "${ip}/32" --arg desc "hetzner-deploy run ${GITHUB_RUN_ID:-local}" \
    '[{ description: $desc, direction: "in", port: "22", protocol: "tcp", source_ips: [$cidr] }]')"
  echo "opening ${FIREWALL_NAME} to ${ip}/32 on port 22"
else
  rules='[]'
  echo "closing ${FIREWALL_NAME}"
fi

response="$(hcloud POST "/firewalls/${firewall_id}/actions/set_rules" "{\"rules\":${rules}}")"

# set_rules returns one action per resource the firewall is applied to. The
# rule is not in force until every one has finished, so wait for all of them.
for action_id in $(jq -r '.actions[].id' <<< "${response}"); do
  status="running"
  for _ in $(seq 1 30); do
    action="$(hcloud GET "/firewalls/actions/${action_id}")"
    status="$(jq -r '.action.status' <<< "${action}")"
    [[ "${status}" != "running" ]] && break
    sleep 2
  done

  if [[ "${status}" != "success" ]]; then
    echo "::error::Hetzner action ${action_id} ended '${status}': $(jq -c '.action.error // {}' <<< "${action}")"
    exit 1
  fi
done

echo "${FIREWALL_NAME}: ${MODE} done"
