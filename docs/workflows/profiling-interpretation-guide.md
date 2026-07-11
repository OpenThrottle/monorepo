# Profiling interpretation guide

This guide explains how to interpret the CPU profiling metrics captured during Ralph workflow runs. These metrics help answer "is CPU the bottleneck?" and diagnose whether workflows are CPU-bound, I/O-bound, or contending for system resources.

---

## Overview

Ralph workflows now capture three categories of metrics:

1. **Child process metrics** — CPU and memory usage of spawned Ralph/cursor-agent processes
2. **Wall-clock vs CPU time** — Ratio that indicates if a job is CPU-bound or waiting on I/O
3. **System-level metrics** — Load average and PSI (Pressure Stall Information) to detect system contention

These metrics are combined into a one-line summary appended to `plan_output_stream` after each task run.

---

## Quick reference: workload interpretations

| Interpretation      | Meaning                             | Typical cause                                        |
| ------------------- | ----------------------------------- | ---------------------------------------------------- |
| `cpu_bound`         | Wall-clock ≈ CPU time (ratio ≤ 1.5) | Active computation; CPU is the bottleneck            |
| `mixed`             | Moderate ratio (1.5–5x)             | Some CPU work, some waiting (network, LLM API calls) |
| `io_bound`          | High ratio (>5x)                    | Mostly waiting (disk, network, external services)    |
| `idle`              | Zero or negligible CPU time         | Process is blocked or sleeping                       |
| `system_contention` | High system load but low child CPU  | Multiple processes competing for cores               |

---

## 1. Child process metrics

When Ralph spawns `cursor-agent` (or other child processes), `pidusage` polls CPU% and RSS at intervals (default 5s) and returns aggregated metrics.

### Output example

```
Child: peak 85% CPU, avg 42% CPU, peak 512MB RSS, avg 380MB RSS (15 samples)
```

### Fields

| Field            | Description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| `peakCpuPercent` | Highest CPU% observed across all samples (can exceed 100% on multi-core) |
| `avgCpuPercent`  | Average CPU% across samples                                              |
| `peakRssMb`      | Peak resident set size (memory) in MB                                    |
| `avgRssMb`       | Average RSS across samples                                               |
| `sampleCount`    | Number of samples taken during the job                                   |

### Interpretation

| Peak CPU | Avg CPU | Meaning                                              |
| -------- | ------- | ---------------------------------------------------- |
| >80%     | >50%    | Child is CPU-intensive; likely compute-bound         |
| >80%     | <30%    | Spiky CPU usage; bursts of work with idle periods    |
| <30%     | <20%    | Child is mostly idle; waiting on external I/O        |
| >100%    | —       | Using multiple cores (e.g., 150% = 1.5 cores on avg) |

**When peak is high but average is low:** The child does heavy work in short bursts but spends most time waiting. This pattern is common for cursor-agent which waits for LLM API responses.

**When sample count is low:** The job was short; metrics may not be representative. A single sample won't show trends.

---

## 2. Wall-clock vs CPU time ratio

This metric compares actual elapsed time to CPU time consumed by the OpenThrottle worker process.

### Output example

```
Metrics: 120.5s wall, ratio 3.2x (mixed)
```

### Fields

| Field                 | Description                                      |
| --------------------- | ------------------------------------------------ |
| `wallClockMs`         | Total elapsed time (end - start timestamp)       |
| `cpuTimeMs`           | User + system CPU time from `process.cpuUsage()` |
| `wallClockToCpuRatio` | `wallClockMs / cpuTimeMs`                        |
| `interpretation`      | `cpu_bound`, `mixed`, `io_bound`, or `idle`      |

### Interpretation thresholds

| Ratio | Interpretation | What it means                                             |
| ----- | -------------- | --------------------------------------------------------- |
| ≤ 1.5 | `cpu_bound`    | Process was actively using CPU most of the time           |
| 1.5–5 | `mixed`        | Some CPU work, some waiting (typical for I/O-heavy tasks) |
| > 5   | `io_bound`     | Mostly waiting (disk, network, spawned processes)         |
| ∞     | `idle`         | Zero CPU time recorded; process did nothing or just slept |

**Important:** The wall-clock vs CPU time ratio measures the OpenThrottle worker process, not the spawned child. Use this to understand if the worker is busy or idle while waiting for children.

### Example scenarios

| Scenario                    | Ratio | Child peak CPU | Diagnosis                                         |
| --------------------------- | ----- | -------------- | ------------------------------------------------- |
| Worker spawns child, waits  | 50x   | 70%            | Worker I/O-bound (waiting); child doing real work |
| Worker does file processing | 1.2x  | 10%            | Worker CPU-bound; child mostly idle               |
| Worker + child both busy    | 1.8x  | 85%            | Mixed: worker has some CPU work, child is active  |

---

## 3. System-level metrics

System metrics capture overall CPU pressure at job start and end.

### Output example

```
System CPU: load 4.2 (1.05/core on 4 cores), pressure: moderate, PSI some10s: 8.5%
```

### Fields

| Field           | Description                                          |
| --------------- | ---------------------------------------------------- |
| `load1m`        | 1-minute load average (from `os.loadavg()`)          |
| `perCoreLoad1m` | `load1m / cpuCount` — load per logical CPU           |
| `cpuCount`      | Number of logical CPUs                               |
| `pressureLevel` | `low`, `moderate`, `high`, or `unknown`              |
| `psi.some10s`   | (Linux only) % of time at least one task was stalled |

### Pressure level thresholds

| Level      | Per-core load | PSI some | Meaning                                           |
| ---------- | ------------- | -------- | ------------------------------------------------- |
| `low`      | < 0.7         | < 5%     | System has spare capacity                         |
| `moderate` | 0.7–1.5       | 5–20%    | System is busy but not saturated                  |
| `high`     | > 1.5         | > 20%    | System is oversubscribed; tasks competing for CPU |

### Platform notes

- **Linux:** Full PSI metrics available (cgroup v2 required). Shows stall time at 10s, 60s, 300s windows.
- **macOS/Windows:** PSI unavailable. Uses only load average for pressure level.
- **Per-core load > 1:** More runnable processes than CPUs; some are waiting in the queue.

---

## 4. Troubleshooting guide

### Problem: Workflows are slow but CPU metrics are low

**Symptoms:**

- `interpretation: io_bound` (ratio > 5)
- Child peak CPU < 30%
- System pressure: `low`

**Diagnosis:** Workflows are waiting, not computing.

**Possible causes:**

- Waiting for LLM API responses (cursor-agent → Claude/OpenAI)
- Network latency to OpenThrottle/Redis
- Slow disk I/O (large file reads/writes)

**Actions:**

- Check LLM API latency; consider faster models or caching
- Profile network round-trips
- Check if child is blocking on stdin/stdout

---

### Problem: Workflows are slow and child CPU is high

**Symptoms:**

- `interpretation: cpu_bound` or `mixed`
- Child peak CPU > 80%
- System pressure: `moderate` or `high`

**Diagnosis:** Child process is compute-bound; may benefit from more CPU.

**Possible causes:**

- cursor-agent doing heavy processing (TypeScript compilation, linting, etc.)
- Running multiple Ralph instances competing for cores

**Actions:**

- Reduce parallelism (fewer concurrent plan jobs)
- Upgrade to machine with more cores
- Profile child to identify expensive operations

---

### Problem: System shows high pressure but child CPU is low

**Symptoms:**

- System pressure: `high` (per-core load > 1.5)
- Child peak CPU < 50%
- `interpretation: system_contention` (if available)

**Diagnosis:** Multiple processes competing; your child is being CPU-starved.

**Possible causes:**

- Running too many parallel Ralph/workflow-ralph instances
- Other system processes consuming CPU
- Container/VM resource limits

**Actions:**

- Reduce concurrency (`OT_PLANS_CONCURRENCY`)
- Check for other CPU-intensive processes (`top`, `htop`)
- Increase container CPU allocation

---

### Problem: Metrics show `idle` interpretation

**Symptoms:**

- `cpuTimeMs: 0` or negligible
- `interpretation: idle`
- Wall-clock time may be non-zero

**Diagnosis:** The worker process consumed no CPU during the job.

**Possible causes:**

- Job completed instantly (nothing to do)
- Process was blocked entirely (deadlock, missing input)
- Measurement window too short

**Actions:**

- Check if the job actually performed work
- Review logs for errors or early exits
- Ensure proper job initialization

---

## 5. Example output

A full task run metrics summary line looks like:

```
Metrics: 45.2s wall, child peak 85%, ratio 2.5x (mixed), load 1.2/core (moderate)
```

Breaking this down:

| Part                       | Value                | Meaning                                        |
| -------------------------- | -------------------- | ---------------------------------------------- |
| `45.2s wall`               | 45.2 seconds elapsed | Total job duration                             |
| `child peak 85%`           | 85% peak CPU         | Spawned child hit 85% CPU at some point        |
| `ratio 2.5x (mixed)`       | 2.5x ratio           | Worker spent 2.5x more wall time than CPU time |
| `load 1.2/core (moderate)` | 1.2 load per core    | System is moderately busy                      |

**Overall characterization:** This is a `mixed` workload. The child does real CPU work (peak 85%), but the worker spends significant time waiting (ratio 2.5x). System load is healthy.

---

## 6. Viewing metrics

### In plan output stream

After each task run, metrics are appended to `plan_output_stream`. Query via:

```bash
# Using OpenThrottle MCP
openthrottle:get_plan_output(planId)

# Or in GraphQL
query { planOutput(planId: "...") { chunks { content } } }
```

### In job return value

GraphQL query for a completed job includes `taskRunMetrics`:

```graphql
query {
  job(jobId: "...", queueName: "plans") {
    returnvalue
  }
}
```

Parse `returnvalue` JSON to get full `taskRunMetrics` object.

### In structured logs

Plan processor logs with `event: "plan_run_metrics"` include the full metrics payload for log aggregation and alerting.

---

## 7. Related documentation

- [Server and task metrics](../../tools/workflows/docs/server-and-task-metrics.md) — Original metrics design (server process, start/end snapshots)
- [Ralph design](./ralph-design.md) — Workflow architecture and CLI usage
- [Profiling UI usage](../../tools/workflows/docs/profiling-ui-usage.md) — Using the profiling UI to visualize metrics

---

## 8. Summary: answering "is CPU the bottleneck?"

Use this decision tree:

1. **Check wall-clock ratio:**
   - ≤ 1.5 (`cpu_bound`) → Yes, CPU is the bottleneck
   - > 5 (`io_bound`) → No, you're waiting on I/O
   - 1.5–5 (`mixed`) → Partially; continue to step 2

2. **Check child peak CPU:**
   - > 80% → Child is compute-heavy; CPU matters
   - < 30% → Child is waiting; CPU is not the issue

3. **Check system pressure:**
   - `high` → System contention; reduce parallelism
   - `low` → Spare capacity; consider adding parallelism

**If ratio is high and child CPU is low:** The bottleneck is external (network, LLM API, disk). Focus on reducing wait time, not adding CPU.

**If ratio is low and child CPU is high:** The bottleneck is CPU. Consider faster machines or reduced parallelism.

**If system pressure is high:** Too many processes competing. Reduce concurrency first before diagnosing individual jobs.
