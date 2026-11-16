/**
 * @description Maps the server's typed system metrics onto their GraphQL objects.
 */

import type {
  CgroupMetrics,
  SystemMetricsSnapshot,
} from '../../metrics/system-metrics/system-metrics.types.ts';
import { ContainerMetricsObject } from './container-metrics.object.ts';
import { SystemMetricsSnapshotObject } from './system-metrics-snapshot.object.ts';

/**
 * @description Flattens the cgroup union onto ContainerMetricsObject: `available` says which
 * branch it was, and the other branch's fields are null.
 */
export function toContainerMetricsObject(
  metrics: CgroupMetrics,
): ContainerMetricsObject {
  const out = new ContainerMetricsObject();
  out.scope = 'container';
  if (metrics.kind === 'unavailable') {
    out.available = false;
    out.cpu = null;
    out.cpuWindow = null;
    out.memory = null;
    out.path = null;
    out.psi = null;
    out.unavailableReason = metrics.reason;
    return out;
  }
  out.available = true;
  out.cpu = { ...metrics.cpu };
  out.cpuWindow = metrics.cpuWindow === null ? null : { ...metrics.cpuWindow };
  out.memory = {
    ...metrics.memory,
    events:
      metrics.memory.events === null ? null : { ...metrics.memory.events },
  };
  out.path = metrics.path;
  out.psi = { ...metrics.psi };
  out.unavailableReason = null;
  return out;
}

/**
 * @description Maps the live system snapshot onto SystemMetricsSnapshotObject.
 */
export function toSystemMetricsSnapshotObject(
  snapshot: SystemMetricsSnapshot,
): SystemMetricsSnapshotObject {
  const out = new SystemMetricsSnapshotObject();
  out.activeProcesses = {
    ...snapshot.activeProcesses,
    lockedWorktrees: [...snapshot.activeProcesses.lockedWorktrees],
  };
  out.container = toContainerMetricsObject(snapshot.container);
  out.hostMemory = { ...snapshot.hostMemory };
  out.loadAverage = { ...snapshot.loadAverage };
  out.platform = snapshot.platform;
  out.pressureBasis = snapshot.pressureBasis;
  out.pressureLevel = snapshot.pressureLevel;
  out.psi = { ...snapshot.psi };
  out.psiAvailable = snapshot.psiAvailable;
  out.timestamp = snapshot.timestamp;
  return out;
}
