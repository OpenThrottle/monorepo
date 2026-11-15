#!/usr/bin/env sh
#
# A durable, local record of every destroy.sh invocation — removals AND refusals.
#
# Why: neither git nor `git worktree remove` records who removed a worktree or
# when. A live plan-run worktree once vanished and nothing could name the caller:
# the sessions that might have done it were deleted with their transcripts, and
# the server's logs died on restart. One JSON line per invocation, appended to
# ~/.openthrottle/logs/worktree-removals.log, makes a removal attributable after
# the fact — `jq` or `grep` it by path or branch.
#
# Each line carries: ts, result, path, branch, repo, force, dry_run, probe (the
# active-run probe outcome), pid, ppid, parent (the parent's command line) and
# ancestry (a few levels of "pid command" above it, since the direct parent is
# usually a `pnpm`/`sh -c` wrapper and the real caller sits further up), and
# agent_session — the calling agent's session id when its harness exports one
# (Claude Code: CLAUDE_CODE_SESSION_ID), which still names the session after its
# transcript is deleted.
#
# result is one of: removed, dry-run, refused-dirty, refused-active-run,
# refused-not-registered, refused-not-a-repo, refused-teardown-failed, or failed
# (anything that exited non-zero past the guards, e.g. `git worktree remove`).
#
# worktree_removal_audit_json prints the same attribution fields as the
# `audit` object deregister.sh sends with the post-removal deregisterWorktreeCheckout
# call, so the server keeps a copy that survives a lost laptop log.
#
# Strictly best-effort: nothing here may fail or block a removal. Every write is
# in a subshell with errors swallowed. Override the file with
# OPENTHROTTLE_WORKTREE_REMOVAL_LOG; set it to 0 to switch the log off.
#
# Sourced, never executed. POSIX sh.

# JSON-escape one value: backslash, quote, and control whitespace folded to spaces.
# Long values (command lines) are capped so one line stays one readable line.
_rl_json() {
  printf '%s' "$1" | tr '\n\r\t' '   ' | cut -c 1-500 | sed 's/\\/\\\\/g; s/"/\\"/g'
}

# The command line of a pid, or nothing.
_rl_command_of() {
  ps -o command= -p "$1" 2>/dev/null | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

# The parent pid of a pid, or nothing.
_rl_parent_of() {
  ps -o ppid= -p "$1" 2>/dev/null | tr -d '[:space:]'
}

# Up to four ancestors above $1, "pid command" joined by " <- ".
_rl_ancestry() {
  _rla_pid="$1"
  _rla_out=""
  _rla_depth=0
  while [ "$_rla_depth" -lt 4 ]; do
    _rla_pid=$(_rl_parent_of "$_rla_pid")
    case "$_rla_pid" in '' | 0 | 1) break ;; esac
    _rla_entry="$_rla_pid $(_rl_command_of "$_rla_pid" | cut -c 1-300)"
    if [ -z "$_rla_out" ]; then
      _rla_out="$_rla_entry"
    else
      _rla_out="$_rla_out <- $_rla_entry"
    fi
    _rla_depth=$((_rla_depth + 1))
  done
  printf '%s' "$_rla_out"
}

# Where the log goes; prints nothing when it is switched off.
worktree_removal_log_path() {
  _rlp="${OPENTHROTTLE_WORKTREE_REMOVAL_LOG:-}"
  if [ "$_rlp" = "0" ]; then
    return 0
  fi
  [ -n "$_rlp" ] || _rlp="${HOME:-}/.openthrottle/logs/worktree-removals.log"
  printf '%s' "$_rlp"
}

# Append one line. Always returns 0.
# $1 result, $2 worktree path, $3 branch, $4 primary checkout, $5 active-run probe
# outcome, $6 force (0/1), $7 dry run (0/1).
record_worktree_removal() {
  (
    _rl_file=$(worktree_removal_log_path)
    [ -n "$_rl_file" ] || exit 0
    mkdir -p "$(dirname "$_rl_file")" || exit 0

    _rl_ppid="${PPID:-}"
    printf '{"ts":"%s","result":"%s","path":"%s","branch":"%s","repo":"%s","force":%s,"dry_run":%s,"probe":"%s","pid":%s,"ppid":%s,"parent":"%s","ancestry":"%s","agent_session":"%s"}\n' \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      "$(_rl_json "$1")" \
      "$(_rl_json "$2")" \
      "$(_rl_json "$3")" \
      "$(_rl_json "$4")" \
      "$([ "${6:-0}" = "1" ] && echo true || echo false)" \
      "$([ "${7:-0}" = "1" ] && echo true || echo false)" \
      "$(_rl_json "$5")" \
      "$$" \
      "${_rl_ppid:-null}" \
      "$(_rl_json "$(_rl_command_of "$_rl_ppid")")" \
      "$(_rl_json "$(_rl_ancestry "$_rl_ppid")")" \
      "$(_rl_json "${CLAUDE_CODE_SESSION_ID:-}")" \
      >>"$_rl_file"
  ) 2>/dev/null || true
  return 0
}

# A pid as a JSON number, or null when it is not a plain positive integer.
_rl_json_pid() {
  case "$1" in
    '' | *[!0-9]*) printf 'null' ;;
    *) printf '%s' "$1" ;;
  esac
}

# The removal-log attribution fields as a WorktreeRemovalAuditInput JSON object,
# for deregister.sh. Prints `{}` if anything goes wrong; never fails.
# $1 result, $2 branch, $3 active-run probe outcome.
worktree_removal_audit_json() {
  (
    _ra_ppid="${PPID:-}"
    printf '{"result":"%s","branch":"%s","probe":"%s","pid":%s,"ppid":%s,"parent":"%s","ancestry":"%s","agentSession":"%s","ts":"%s"}' \
      "$(_rl_json "$1")" \
      "$(_rl_json "$2")" \
      "$(_rl_json "$3")" \
      "$(_rl_json_pid "$$")" \
      "$(_rl_json_pid "$_ra_ppid")" \
      "$(_rl_json "$(_rl_command_of "$_ra_ppid")")" \
      "$(_rl_json "$(_rl_ancestry "$_ra_ppid")")" \
      "$(_rl_json "${CLAUDE_CODE_SESSION_ID:-}")" \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  ) 2>/dev/null || printf '{}'
  return 0
}
