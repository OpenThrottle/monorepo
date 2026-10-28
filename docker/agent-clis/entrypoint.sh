#!/bin/sh
# Entrypoint for the Dockerfile.NestJS `production-agents` target ONLY.
#
# The server spawns agent CLIs (claude, codex, gemini) as child processes. Those
# children receive an allowlisted env: HOME is passed, GITHUB_TOKEN is not. So git
# credentials and identity must live under $HOME (a mounted volume), where every
# child finds them, rather than in the server's own environment:
#
#   GITHUB_TOKEN                          -> `gh auth login` + `gh auth setup-git`,
#                                            so git HTTPS to github.com uses the gh
#                                            credential helper (hosts.yml in $HOME).
#   OT_GIT_USER_NAME / OT_GIT_USER_EMAIL  -> `git config --global user.name/email`.
#
# Every step is idempotent (safe on each restart) and best-effort: a read-only or
# missing $HOME, or a rejected token, logs a warning on stderr and the server still
# starts. The token is only ever read from the environment and piped to gh on stdin
# — never put in argv, never echoed.
#
# Run-time override: this is the image ENTRYPOINT, so `docker run <image> <cmd>`
# (e.g. `docker run --rm <image> claude --version`) runs the setup, then <cmd>.
# Use `--entrypoint` to skip the setup entirely. The final exec hands off to the
# base image's docker-entrypoint.sh, which keeps the argv-only convention the other
# targets support (`docker run <image> -r dotenv/config build/src/bootstrap.js`
# becomes `node -r dotenv/config build/src/bootstrap.js`).
set -u

warn() {
  printf 'agent-entrypoint: warning: %s\n' "$*" >&2
}

home_writable() {
  [ -n "${HOME:-}" ] && [ -d "${HOME}" ] && [ -w "${HOME}" ]
}

configure_github() {
  if ! command -v gh > /dev/null 2>&1; then
    warn 'gh is not installed; skipping GitHub login'
    return 0
  fi

  # The token goes in on stdin. GITHUB_TOKEN/GH_TOKEN are removed from gh's own env:
  # with either set, gh would use it directly and refuse to store credentials.
  # --insecure-storage keeps them in $HOME/.config/gh/hosts.yml (no OS keyring in a
  # container), which is exactly where the agent children look.
  if ! printf '%s\n' "${GITHUB_TOKEN}" \
    | env -u GITHUB_TOKEN -u GH_TOKEN \
      gh auth login --hostname github.com --git-protocol https --insecure-storage --with-token \
      > /dev/null 2>&1; then
    warn 'gh auth login failed (bad or expired GITHUB_TOKEN, or no network); continuing without GitHub credentials'
    return 0
  fi

  if ! env -u GITHUB_TOKEN -u GH_TOKEN gh auth setup-git --hostname github.com > /dev/null 2>&1; then
    warn 'gh auth setup-git failed; git will not use the gh credential helper'
  fi
}

configure_git_identity() {
  if [ -n "${OT_GIT_USER_NAME:-}" ]; then
    git config --global user.name "${OT_GIT_USER_NAME}" 2> /dev/null \
      || warn 'could not write git user.name'
  fi
  if [ -n "${OT_GIT_USER_EMAIL:-}" ]; then
    git config --global user.email "${OT_GIT_USER_EMAIL}" 2> /dev/null \
      || warn 'could not write git user.email'
  fi
}

if [ -n "${GITHUB_TOKEN:-}" ] || [ -n "${OT_GIT_USER_NAME:-}" ] || [ -n "${OT_GIT_USER_EMAIL:-}" ]; then
  if home_writable; then
    [ -n "${GITHUB_TOKEN:-}" ] && configure_github
    configure_git_identity
  else
    warn "HOME (${HOME:-unset}) is not a writable directory; skipping GitHub login and git identity"
  fi
fi

exec docker-entrypoint.sh "$@"
