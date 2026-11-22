# Reading server metrics inside a container

The server reports system metrics at `GET /metrics/system` and in GraphQL as
`metrics { systemSnapshot }`. Plan runs record the same readings, taken at their start and end, in
`taskRunMetrics.systemCpuMetrics`. Every group in those payloads carries a `scope`, and the scope
tells you which machine the number describes. Under Docker that is often not the one you'd guess.

| Scope       | Groups                                                     | What it describes                                         |
| ----------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| `host`      | `loadAverage`, `hostMemory`, `psi`                         | The whole box (on Docker Desktop, the Linux VM)           |
| `container` | `container` (limits, usage, throttling, memory, its `psi`) | The server's own cgroup: the Compose `cpus`/`mem_limit`   |
| `process`   | `activeProcesses`                                          | The server process and the worktree-backed runs it tracks |

## Why load average and PSI are host-wide

Docker gives a container its own PID and mount namespaces. Without lxcfs it does not give it its own
`/proc/loadavg`, `/proc/meminfo` or `/proc/pressure/*`. So `os.loadavg()`, `os.totalmem()`,
`os.freemem()`, `os.cpus()` and `/proc/pressure/cpu` all report the host.

This was measured by running the published server image under the Hetzner `server` limits
(`--cpus 0.75 --memory 640m`) and comparing against the host:

| Reading                         | Inside the container       | Host               |
| ------------------------------- | -------------------------- | ------------------ |
| `os.loadavg()`                  | 1.12 / 0.77 / 0.67         | 1.11 / 0.78 / 0.67 |
| `os.totalmem()`                 | 15973 MB                   | 15973 MB           |
| `os.cpus().length`              | 5                          | 5                  |
| `/proc/pressure/cpu` some avg10 | 1.73                       | 1.73               |
| `/sys/fs/cgroup/cpu.max`        | `75000 100000` (0.75 vCPU) | none at the root   |
| `/sys/fs/cgroup/memory.max`     | `671088640` (640 MB)       | none at the root   |

The container's limits appear only under `/sys/fs/cgroup`. That's what the `container` group reads.

So `perCoreLoad1m` divides **host** load by **host** CPUs. On the CX23 it counts Postgres, the
developer SSR process and everything else on the box, against 2 vCPU. It can't tell you whether the
server has hit its own 0.75 vCPU ceiling. When the server has a `cpu.max` limit, `pressureLevel` is
judged on the container instead, and `pressureBasis` says `container`.

## What the container numbers mean for sizing

- **`container.cpuWindow.throttledPeriodRatio`** is the share of 100 ms scheduler periods in which
  the server used up its quota and was paused. Live readings use the window since the previous read;
  a plan run uses the whole run (`systemCpuMetrics.containerCpuWindow`). A sustained ratio above
  about 0.05 means the `cpus` limit is shaping latency. Above 0.25 it's the bottleneck. Raise the
  service's `cpus`, or move to a bigger box (rung 1 in [SCALING.md](./SCALING.md)) when the limits
  already sum past the vCPUs.
- **`usageRatioOfLimit`** near 1 with throttling means the server is CPU-bound at its ceiling.
  Throttling with low usage means short bursts are being clipped. That's usually still worth fixing
  for request latency.
- **`container.memory.events.oomKill`** counts processes the kernel killed for exceeding
  `memory.max`. Any non-zero value means the limit is too small for real load: raise `mem_limit`
  before anything else. `max` counts how often usage hit the limit and the kernel had to reclaim
  memory. A rising `max` with zero `oomKill` is a warning, not a failure.
- **`container.psi`** is the cgroup's own `cpu.pressure`: time its tasks spent waiting for CPU,
  whether from throttling or from host contention. Compare it with the host `psi`. High container PSI
  under low host PSI points at the server's own limit. High PSI in both points at the box.
- **`hostMemory.usedRatio`** is the box. The page cache counts as used, so a high number on its own
  isn't a problem. Read it alongside each container's `memory.current`.

`container.available: false` with an `unavailableReason` is normal on macOS and on cgroup v1 hosts.
Only `host` and `process` numbers exist there, and `pressureBasis` stays `host`.

## No host `/proc` bind mount

None of this needs a privileged container or a host `/proc` bind mount. The container's own cgroup
files are readable unprivileged inside its cgroup namespace, and the host-wide numbers already come
through.

If a future metric ever seemed to need one, weigh the cost first. Mounting the host's `/proc` into
the server exposes every host process's command line and environment (including other containers'
secrets), its open file descriptors and its memory maps. A compromised server would then be a
compromised box. Prefer a dedicated exporter on the host (node-exporter, cAdvisor) that the server
never shares a mount with.
