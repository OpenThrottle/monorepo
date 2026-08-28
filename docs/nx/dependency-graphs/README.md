# Dependency graph snapshots

**Empty by design.** The scheduled workflow that would commit snapshots here
(`.github/workflows/dependency-graph-scheduled.yml`) is disabled — each committed snapshot grows the
repo and raises clone cost for every other workflow.

To generate a graph, see
[docs/monorepo/nx-graph.md](../../monorepo/nx-graph.md#generated-snapshots--mostly-not-running-today).
