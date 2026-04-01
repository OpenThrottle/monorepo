# @openthrottle/react-router-profiling

React components and hooks for displaying **server process metrics** (current snapshot) and **task-run metrics** (atStart/atEnd from plan jobs) for openthrottle-server. Uses `@openthrottle/react-router-shadcn` for UI. No host/system metrics—process-only per [server-and-task-metrics.md](../../tools/workflows/docs/server-and-task-metrics.md).

## Installation

**In this monorepo:** add `"@openthrottle/react-router-profiling": "workspace:*"` (and `@openthrottle/react-router-shadcn` as needed) to the app’s `package.json`, then run `pnpm install` from the repository root.

This package is **private** to the workspace and is not published to the public registry.

**Peer dependency:** `react` (>=18). The package depends on `@openthrottle/react-router-shadcn`; ensure your app has it (or list it as a peer) and that the shadcn theme/CSS is loaded (e.g. import the theme from the shadcn package or your app’s global CSS).

## Mounting the metrics UI in your app

### 1. Configure the API base URL

The library talks to **openthrottle-server** for GET `/metrics` and GraphQL (e.g. `job(jobId, queueName: "plans")`). Set the base URL once at app startup so all components use the same backend:

```ts
import { setMetricsApiBaseUrl } from '@openthrottle/react-router-profiling';

// e.g. from env or your app config
setMetricsApiBaseUrl(
  process.env.OPENTHROTTLE_API_URL ?? 'http://localhost:6010',
);
```

Alternatively you can pass `apiBaseUrl` per component (see below). Environment fallbacks: `OPENTHROTTLE_API_URL` or `API_URL`; if unset, the default is `http://localhost:6010`.

### 2. Server metrics (current process snapshot)

Renders a card with the current Node process snapshot: RSS, heap used/total, external memory, CPU user/system (see design doc §1).

```tsx
import { ServerMetricsCard } from '@openthrottle/react-router-profiling';

// On-demand only (user clicks Refresh)
<ServerMetricsCard />

// Optional polling (e.g. every 10s)
<ServerMetricsCard intervalMs={10_000} />

// Override API base URL for this card
<ServerMetricsCard apiBaseUrl="https://api.example.com" />
```

### 3. Task-run metrics (plan job atStart/atEnd)

Renders a card with task-run metrics for a **plans-queue job**: atStart, atEnd, and deltas. Requires a job ID (e.g. from your plan run or job list).

```tsx
import { TaskRunMetricsCard } from '@openthrottle/react-router-profiling';

// With a job ID (e.g. from plan run context)
<TaskRunMetricsCard jobId={jobId} />

// No job selected
<TaskRunMetricsCard jobId={null} />
```

### Example layout (e.g. openthrottle-developer)

You can mount both cards in a layout or a dedicated “Profiling” / “Metrics” section:

```tsx
import {
  ServerMetricsCard,
  TaskRunMetricsCard,
} from '@openthrottle/react-router-profiling';

export function MetricsSection({ planJobId }: { planJobId: string | null }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ServerMetricsCard intervalMs={0} />
      <TaskRunMetricsCard jobId={planJobId} />
    </div>
  );
}
```

Call `setMetricsApiBaseUrl()` once in your app root or config (e.g. in `root.tsx` or before rendering).

## Data layer and hooks

If you need to wire your own UI:

- **Server metrics:** `useServerMetrics({ apiBaseUrl?, intervalMs? })` → `{ error, loading, refetch, serverMetrics }`. Data comes from GET `/metrics`.
- **Task-run metrics:** `useJobTaskRunMetrics(jobId, { apiBaseUrl? })` → `{ error, job, loading }`. Data comes from GraphQL `job(jobId, queueName: "plans")`; `job.taskRunMetrics` has `atStart` and `atEnd`.
- **Deltas:** `computeTaskRunDeltas(atStart, atEnd)` from `@openthrottle/react-router-profiling` returns per-metric deltas (end − start).

Config helpers: `getMetricsApiBaseUrl()`, `setMetricsApiBaseUrl(url)`.

## Interpreting the stats

Summary of how to read the numbers (full detail: [server-and-task-metrics.md §6.4](../../tools/workflows/docs/server-and-task-metrics.md#64-how-to-interpret-the-stats)).

| Metric                        | Meaning                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **RSS (start → end)**         | Resident set size (MB). **Increase** = more process memory used by the end of the run.                         |
| **Heap (start → end)**        | V8 heap used (MB). **Growth** = more JS objects allocated during the run.                                      |
| **CPU user / system (delta)** | **Delta** (end − start) = CPU time **consumed during the run** (ms). User = JS/V8; system = kernel (e.g. I/O). |

- **Typical use:** Compare deltas across runs or plans to find heavy runs; correlate with plan size or iteration count.
- **Units:** Memory in MB; CPU in milliseconds. For an approximate “CPU % during run”: `(cpuDeltaMs / durationMs) * 100` (single-threaded).

## Design doc reference

- [Server and task run performance metrics (CPU and memory)](../../tools/workflows/docs/server-and-task-metrics.md) — definitions, endpoints (§5), task-run exposure (§6), and **§6.4 How to interpret the stats**.
