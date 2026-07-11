# Server and task run performance metrics (CPU and memory)

This document defines what to capture for CPU and memory visibility on the box running **openthrottle-server** and for **task runs** (Ralph/workflow loops). The existing health module covers API, OpenThrottle DB, Redis, and WebSocket—not process or host resource metrics. This design covers metrics definition, units, and sampling strategy.

---

## 1. Node process metrics (in scope)

Capture these from the **Node.js process** running openthrottle-server (and, where applicable, from the BullMQ worker process during job execution).

### 1.1 Memory

Use `process.memoryUsage()` and expose:

| Field         | Source                    | Unit | Description                               |
| ------------- | ------------------------- | ---- | ----------------------------------------- |
| `rssMb`       | `memoryUsage().rss`       | MB   | Resident set size (total process memory). |
| `heapUsedMb`  | `memoryUsage().heapUsed`  | MB   | V8 heap used.                             |
| `heapTotalMb` | `memoryUsage().heapTotal` | MB   | V8 heap total.                            |
| `externalMb`  | `memoryUsage().external`  | MB   | C++ objects bound to JS (e.g. Buffers).   |

**Units:** Convert bytes to MB (divide by `1024 * 1024`), rounded to 2 decimal places for API responses.

**Rationale:** RSS is what the OS sees; heap used/total and external are useful for debugging Node/V8 behavior. Omitting `arrayBuffers` from the initial shape is acceptable; add later if needed.

### 1.2 CPU

Use `process.cpuUsage()` and expose:

| Field         | Source              | Unit | Description                                             |
| ------------- | ------------------- | ---- | ------------------------------------------------------- |
| `cpuUserMs`   | `cpuUsage().user`   | ms   | User CPU time (microseconds from Node, expose as ms).   |
| `cpuSystemMs` | `cpuUsage().system` | ms   | System CPU time (microseconds from Node, expose as ms). |

**Units:** Node returns microseconds; convert to milliseconds (divide by 1000) for the API.

**Usage percent:** For a "current CPU usage %" style metric, take two snapshots over a short window (e.g. 100–500 ms), compute delta of `user + system`, divide by (window ms × 1000) to get usage in 0–1 scale, then multiply by 100 for percent. Optional for the first iteration; can be added when an endpoint or UI needs "current load %".

---

## 2. Host / system metrics (out of scope for now)

**Decision:** Do **not** implement host-level CPU and memory (e.g. `os.cpus()`, `os.freemem()`, `os.totalmem()`) inside openthrottle-server for this plan.

**Rationale:**

- Process metrics are sufficient to answer "how much CPU/memory is the server (or this job) using?"
- Host-level metrics are better provided by the OS or existing tooling (e.g. Prometheus node_exporter, container stats, cloud metrics). Keeping the server focused on its own process avoids duplication and platform-specific logic.

If host metrics are needed later, they can be added as optional fields (e.g. `hostFreememMb`, `hostTotalmemMb`) behind a config flag or a separate endpoint.

---

## 3. Sampling strategy

### 3.1 Server process (openthrottle-server)

- **On-demand only.** No background interval sampling.
- A single "current snapshot" API (e.g. GET `/metrics` or a `serverMetrics` GraphQL query) reads `process.memoryUsage()` and `process.cpuUsage()` at request time and returns the values.
- Optional: if "CPU usage %" is required, the endpoint can take two snapshots with a short delay (e.g. 100 ms) and return the derived percentage in addition to raw `cpuUserMs` / `cpuSystemMs`.

### 3.2 Task runs (Ralph / plan job execution)

- **Snapshot at job start and at job end.** In the plans processor (or a small wrapper around the job handler), capture a metrics snapshot when the job begins and when it finishes. Attach these to the job (e.g. in progress payload or return value) or store in a structure keyed by job/plan id.
- **Optional:** For long-running Ralph loops, sample at fixed intervals (e.g. every 30 s) during the run and store the last N samples or a summary (min/max/avg). Defer interval sampling to a follow-up unless required for the first iteration.

---

## 4. Summary of decisions

| Topic                 | Decision                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Process memory**    | Expose `rssMb`, `heapUsedMb`, `heapTotalMb`, `externalMb` (from `process.memoryUsage()`), units in MB.                                   |
| **Process CPU**       | Expose `cpuUserMs`, `cpuSystemMs` (from `process.cpuUsage()`), units in ms. Optional: CPU usage % via two snapshots over a short window. |
| **Host metrics**      | Out of scope; leave to OS/tooling (e.g. node_exporter, container/cloud metrics).                                                         |
| **Server sampling**   | On-demand only (snapshot at request time for the metrics endpoint).                                                                      |
| **Task-run sampling** | Snapshot at job start and job end; optional interval sampling for long runs in a follow-up.                                              |

Implementing these definitions is covered by the remaining plan tasks: metrics collection in openthrottle-server, exposing an endpoint, sampling in the plans processor, and exposing or persisting task-run metrics for analysis.

---

## 5. Exposed endpoints (implemented)

- **REST:** `GET /metrics` — returns current process snapshot: `rssMb`, `heapUsedMb`, `heapTotalMb`, `externalMb`, `cpuUserMs`, `cpuSystemMs` (same shape as §1).
- **GraphQL:** Query `serverMetrics` — returns the same `ServerMetricsObject` (memory in MB, CPU in ms). Same data as GET `/metrics`.

---

## 6. Task-run metrics: how to get them and how to interpret

Per-job CPU and memory are captured at job start and end. They are exposed in three ways:

### 6.1 Job result / API response

- **GraphQL:** Query `job(jobId, queueName: "plans")` returns a `JobObject` whose `returnvalue` is a JSON string. When the job has completed, parse `returnvalue`; it contains `taskRunMetrics: { atStart, atEnd }`, each with `rssMb`, `heapUsedMb`, `heapTotalMb`, `externalMb`, `cpuUserMs`, `cpuSystemMs`.
- **Use case:** UI or scripts that fetch a specific plan run job and want full numeric metrics.

### 6.2 Plan output stream (OpenThrottle)

- After each plan run finishes, a one-line summary is appended to the plan's output stream (OpenThrottle `plan_output_stream`). Example:  
  `Task run metrics: RSS 45.2→52.1 MB, heap 22.1→28.3 MB, CPU user 120→450 ms, system 10→80 ms`
- **Use case:** `get_plan_output` (MCP or GraphQL) and activity-by-date include this chunk so "last thing that happened" for a plan can show CPU/memory at a glance without querying the job.

### 6.3 Structured log

- When a plan run job completes, one log line is written with `event: "plan_run_metrics"` and a JSON payload containing `planId`, `jobId`, and `taskRunMetrics` (full `atStart` / `atEnd`).
- **Use case:** Log aggregators (e.g. Datadog, CloudWatch) can index and alert on CPU/memory per plan run.

### 6.4 How to interpret the stats

| Metric                              | Meaning                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RSS (start → end)**               | Resident set size in MB. Increase = more process memory used by the end of the run.                                                               |
| **heap (start → end)**              | V8 heap used in MB. Growth indicates more JS objects allocated during the run.                                                                    |
| **CPU user / system (start → end)** | Cumulative process CPU time in ms. The **delta** (end − start) is the CPU time consumed during the run. User = JS/V8; system = kernel (e.g. I/O). |

- **Typical use:** Compare deltas across runs or plans to find heavy runs; correlate with plan size or iteration count.
- **Units:** Memory in MB; CPU in milliseconds. For "CPU % during run" you'd need run duration in ms and then `(cpuDeltaMs / durationMs) * 100` (approximate, single-threaded).

---

## 7. Advanced profiling: child process and system metrics

For deeper analysis of whether workflows are CPU-bound, I/O-bound, or contending for system resources, see the **[Profiling interpretation guide](../../../docs/workflows/profiling-interpretation-guide.md)**.

That guide covers:

- **Child process metrics** — CPU and memory of spawned Ralph/cursor-agent processes (via `pidusage`)
- **Wall-clock vs CPU time ratio** — Determines if jobs are compute-heavy or waiting
- **System-level metrics** — Load average and Linux PSI for detecting system contention
- **Troubleshooting guide** — How to diagnose and fix performance bottlenecks
