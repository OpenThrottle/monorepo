#!/usr/bin/env bash
# Phase 0 spike: dump Skill-related hook stdin to JSONL (seed for Phase 1).
# Fail-open: never block the tool. Always exit 0.
set +e

OUT_DIR="${CLAUDE_PROJECT_DIR:-.}/.cache/skill-usage-spike"
mkdir -p "$OUT_DIR" 2>/dev/null || true

PAYLOAD="$(cat)"
CAPTURED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
GIT_BRANCH="$(
  git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null || true
)"

if command -v jq >/dev/null 2>&1; then
  printf '%s' "$PAYLOAD" |
    jq -c \
      --arg captured_at "$CAPTURED_AT" \
      --arg git_branch "$GIT_BRANCH" \
      '. + { _spike: { captured_at: $captured_at, git_branch: $git_branch } }' \
      >>"$OUT_DIR/payloads.jsonl" 2>/dev/null
else
  printf '{"captured_at":"%s","git_branch":"%s","raw":%s}\n' \
    "$CAPTURED_AT" \
    "$GIT_BRANCH" \
    "$(printf '%s' "$PAYLOAD" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo '""')" \
    >>"$OUT_DIR/payloads.jsonl" 2>/dev/null
fi

exit 0
