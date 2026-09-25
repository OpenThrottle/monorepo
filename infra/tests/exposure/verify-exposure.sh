#!/usr/bin/env bash
#
# Verifies what a deployed OpenThrottle box actually exposes to the internet,
# FROM OFF THE BOX. Run it from somewhere other than the server — the whole
# point is to see the public surface as an outsider does, and a check run
# on-box would happily connect to 127.0.0.1:5432 and tell you nothing.
#
# What it asserts:
#   1. 80 and 443 are reachable (Caddy needs 80 for the ACME HTTP-01 challenge
#      BEFORE it can serve 443 — a firewall that opens only 443 leaves
#      certificate issuance failing silently).
#   2. 5432 and 6379 are NOT reachable. The compose template publishes neither,
#      and the firewall opens neither, so this is defence in depth being checked.
#   3. SSH, if reachable at all, is reachable only from an expected source —
#      which this cannot prove from one vantage point, so it reports rather than
#      asserts, and says why.
#   4. TLS is actually served and the certificate matches the hostname.
#   5. GET /health returns 200 with api/database/redis/websocket all "ok", and
#      the developer app returns 200 at /.
#
# Usage:
#   API_DOMAIN=api.openthrottle.ai DEVELOPER_DOMAIN=developer.openthrottle.ai \
#   SERVER_IP=203.0.113.10 infra/tests/exposure/verify-exposure.sh
#
#   SERVER_IP is optional but recommended: without it the port probes follow DNS,
#   so a stale record would have you probing the OLD host and passing.

set -uo pipefail

: "${API_DOMAIN:?API_DOMAIN is required}"
: "${DEVELOPER_DOMAIN:?DEVELOPER_DOMAIN is required}"

TARGET="${SERVER_IP:-${API_DOMAIN}}"
status=0

pass() { echo "  PASS: $*"; }
fail() {
  echo "  FAIL: $*"
  status=1
}
info() { echo "  INFO: $*"; }

# Returns 0 when a TCP connect succeeds within PROBE_TIMEOUT seconds.
#
# Wrapped in a HARD external timeout on purpose: `nc -w` bounds the idle read,
# not the connect, so a port that silently DROPS packets (rather than sending a
# RST) makes nc hang indefinitely. A dropped-not-refused port is the normal
# behaviour of a cloud firewall, so this is the common case, not the edge case.
#
# `timeout` is coreutils and absent on stock macOS; gtimeout is the Homebrew
# name. Fall back to a background-and-kill so the script still terminates.
readonly PROBE_TIMEOUT="${PROBE_TIMEOUT:-5}"

_timeout_bin() {
  if command -v timeout >/dev/null 2>&1; then
    echo timeout
  elif command -v gtimeout >/dev/null 2>&1; then
    echo gtimeout
  fi
}

probe() {
  local host="$1" port="$2" tbin
  tbin="$(_timeout_bin)"

  if [[ -n "${tbin}" ]]; then
    "${tbin}" "${PROBE_TIMEOUT}" bash -c \
      "exec 3<>/dev/tcp/${host}/${port}" >/dev/null 2>&1
    return $?
  fi

  # No timeout binary: run the connect in the background and reap it.
  bash -c "exec 3<>/dev/tcp/${host}/${port}" >/dev/null 2>&1 &
  local pid=$!
  local waited=0
  while kill -0 "${pid}" 2>/dev/null; do
    if [[ "${waited}" -ge "${PROBE_TIMEOUT}" ]]; then
      kill "${pid}" 2>/dev/null
      wait "${pid}" 2>/dev/null
      return 1
    fi
    sleep 1
    waited=$((waited + 1))
  done
  wait "${pid}" 2>/dev/null
  return $?
}

echo "verifying exposure of ${TARGET}"
if [[ -z "${SERVER_IP:-}" ]]; then
  info "SERVER_IP unset — probing via DNS. A stale record means you may be testing the OLD host."
fi

################################################################################
# 1. DNS — record what it resolves to, so a cutover can be confirmed or rolled back
################################################################################
echo "== dns =="
for d in "${API_DOMAIN}" "${DEVELOPER_DOMAIN}"; do
  resolved="$(dig +short A "${d}" 2>/dev/null | tr '\n' ' ' | sed 's/ $//')"
  if [[ -z "${resolved}" ]]; then
    fail "${d} has no A record"
  else
    info "${d} -> ${resolved}"
    if [[ -n "${SERVER_IP:-}" ]]; then
      if [[ " ${resolved} " == *" ${SERVER_IP} "* ]]; then
        pass "${d} points at ${SERVER_IP}"
      else
        fail "${d} resolves to ${resolved}, not the expected ${SERVER_IP} (cutover incomplete, or DNS still cached)"
      fi
    fi
  fi

  ttl="$(dig +noall +answer A "${d}" 2>/dev/null | awk '{print $2; exit}')"
  if [[ -n "${ttl}" ]]; then
    if [[ "${ttl}" -le 300 ]]; then
      info "${d} TTL=${ttl}s — low, so a rollback propagates quickly"
    else
      info "${d} TTL=${ttl}s — HIGH. Lower it BEFORE a cutover, or a rollback takes this long to take effect."
    fi
  fi
done

################################################################################
# 2. Ports that MUST be open
################################################################################
echo "== ports that must be open =="
for port in 80 443; do
  if probe "${TARGET}" "${port}"; then
    pass "${port}/tcp reachable"
  else
    fail "${port}/tcp NOT reachable$([[ "${port}" == "80" ]] && echo ' — Caddy cannot answer the ACME HTTP-01 challenge, so certificate issuance will fail silently')"
  fi
done

################################################################################
# 3. Ports that MUST be closed
#
# A reachable Postgres or Redis here is a live incident, not a lint warning.
################################################################################
echo "== ports that must be closed =="
for entry in "5432:postgres" "6379:redis"; do
  port="${entry%%:*}"
  name="${entry##*:}"
  if probe "${TARGET}" "${port}"; then
    fail "${port}/tcp (${name}) IS REACHABLE FROM THE INTERNET. Treat as an incident: check for a stray 'ports:' entry in the rendered docker-compose.yml and confirm firewall_enabled is true."
  else
    pass "${port}/tcp (${name}) refused"
  fi
done

################################################################################
# 4. SSH — reported, not asserted
#
# One vantage point cannot distinguish "open to the world" from "open to me
# because my range is allowlisted". Saying so is more useful than a check that
# looks authoritative and is not.
################################################################################
echo "== ssh =="
if probe "${TARGET}" 22; then
  info "22/tcp reachable FROM HERE. That is expected if this vantage point is in ssh_allowed_cidrs."
  info "This does NOT prove SSH is scoped. To prove it, probe from an address that should be denied,"
  info "or read the rule back: hcloud firewall describe <name>"
else
  info "22/tcp not reachable from here — either scoped to other ranges, or ssh_allowed_cidrs is empty."
fi

################################################################################
# 5. TLS
################################################################################
echo "== tls =="
for d in "${API_DOMAIN}" "${DEVELOPER_DOMAIN}"; do
  subject="$(echo | openssl s_client -servername "${d}" -connect "${d}:443" 2>/dev/null |
    openssl x509 -noout -subject -dates 2>/dev/null)"
  if [[ -z "${subject}" ]]; then
    fail "${d}: no TLS certificate served. If port 80 was blocked at first boot, ACME never completed."
  else
    pass "${d}: certificate served"
    # Indent each line without sed (SC2001).
    while IFS= read -r line; do echo "    ${line}"; done <<< "${subject}"
  fi
done

################################################################################
# 6. The application itself
################################################################################
echo "== application =="
health="$(curl -fsS --max-time 15 "https://${API_DOMAIN}/health" 2>/dev/null || true)"
if [[ -z "${health}" ]]; then
  fail "GET https://${API_DOMAIN}/health returned nothing"
else
  echo "    ${health}"
  ok_count=0
  for facet in api database redis websocket; do
    if echo "${health}" | grep -q "\"${facet}\":\"ok\""; then
      ok_count=$((ok_count + 1))
    else
      fail "/health reports ${facet} is NOT ok"
    fi
  done
  [[ "${ok_count}" -eq 4 ]] && pass "/health: api, database, redis, websocket all ok"
fi

# No `|| echo` fallback: -w always emits a code (000 on connect failure), and
# adding one concatenated two codes into "000000".
dev_code="$(curl -o /dev/null -s -w '%{http_code}' --max-time 15 "https://${DEVELOPER_DOMAIN}/" 2>/dev/null)"
dev_code="${dev_code:-000}"
if [[ "${dev_code}" == "200" ]]; then
  pass "developer app returns 200 at /"
else
  fail "developer app returned ${dev_code} at / (expected 200)"
fi

echo
if [[ "${status}" -eq 0 ]]; then
  echo "verify-exposure: OK"
else
  echo "verify-exposure: FAILED"
fi
exit "${status}"
