#!/usr/bin/env bash
#
# ot-worktree: print the Node a checkout should run on, for POSIX-sh callers.
#
# resolve-node.sh is bash and is meant to be sourced; provision.sh (POSIX sh)
# and agent hooks run this wrapper instead and read one tab-separated line:
#
#   ok<TAB><bin dir><TAB><version>   exit 0  — a Node that satisfies engines.node
#   none                             exit 0  — the checkout declares no engines.node
#   fail<TAB><range><TAB><tried>     exit 1  — nothing installed satisfies it
#
# Usage: node-path.sh <checkout> [<primary checkout>]
#
# Writes nothing else to stdout. Cost is one bash spawn plus the resolver
# (~6 ms); it never sources nvm.sh.

set -eu

case "${1:-}" in
  '' | -h | --help)
    echo "Usage: node-path.sh <checkout> [<primary checkout>]" >&2
    [ -n "${1:-}" ] && exit 0
    exit 2
    ;;
esac

# shellcheck source=skills/ot-worktree/scripts/resolve-node.sh
. "$(cd "$(dirname "$0")" && pwd -P)/resolve-node.sh"

if ot_resolve_node "$1" "${2:-}"; then
  printf 'ok\t%s\t%s\n' "$OT_NODE_BIN" "$OT_NODE_VERSION"
  exit 0
fi

if [ -z "$OT_NODE_RANGE" ]; then
  printf 'none\n'
  exit 0
fi

printf 'fail\t%s\t%s\n' "$OT_NODE_RANGE" "$OT_NODE_TRIED"
exit 1
