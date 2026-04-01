# Profiling UI usage and metrics interpretation

This doc points to where the **metrics UI** lives and how to interpret the stats. Full mounting and API details are in the package README.

## Where the UI lives

- **Package:** `@openthrottle/react-router-profiling`
- **README:** [packages/openthrottle/react-router-profiling/README.md](../../packages/react-router-profiling/README.md)

The README covers:

- How to **mount** the metrics UI in an app (e.g. openthrottle-developer): `ServerMetricsCard`, `TaskRunMetricsCard`, and `setMetricsApiBaseUrl()`
- **Config:** API base URL via `setMetricsApiBaseUrl()` or `apiBaseUrl` prop; env fallbacks `OPENTHROTTLE_API_URL` / `API_URL`
- **Data:** GET `/metrics` for server snapshot; GraphQL `job(jobId, queueName: "plans")` for task-run metrics (atStart/atEnd)

## How to interpret the stats

Interpretation of RSS, heap, and CPU (deltas) is defined in:

- **[server-and-task-metrics.md §6.4 — How to interpret the stats](./server-and-task-metrics.md#64-how-to-interpret-the-stats)**

Summary:

| Metric                    | Meaning                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| **RSS (start → end)**     | Increase = more process memory used by the end of the run.                               |
| **Heap (start → end)**    | Growth = more JS objects allocated during the run.                                       |
| **CPU user/system delta** | Delta = CPU time consumed during the run (ms). User = JS/V8; system = kernel (e.g. I/O). |

Use deltas to compare runs or plans and correlate with plan size or iteration count. Memory in MB; CPU in ms.
