/**
 * @description The installed version of a driver's CLI, for the `agent.version` a trajectory
 * records — a score is only comparable alongside the harness version that produced it. Probed once
 * per process per driver with the driver's own `versionArgs` and cached; any failure is `unknown`,
 * never an error, because a missing version must not stop a run.
 */

import { spawnSync } from 'node:child_process';

import type { AgentDriver } from '@openthrottle/openthrottle-drivers';

const VERSION_PROBE_TIMEOUT_MS = 3000;

const cachedVersions = new Map<string, string>();

const probeVersion = (driver: AgentDriver): string => {
  const override =
    driver.binEnv === undefined ? undefined : process.env[driver.binEnv];
  const binary = override?.trim() || driver.binary;

  try {
    const result = spawnSync(binary, [...driver.versionArgs], {
      encoding: 'utf8',
      timeout: VERSION_PROBE_TIMEOUT_MS,
    });
    const firstLine = (result.stdout ?? '').trim().split('\n')[0]?.trim();

    return result.status === 0 && firstLine ? firstLine : 'unknown';
  } catch {
    return 'unknown';
  }
};

/**
 * @description The CLI version string for `driver`, or `unknown`.
 */
export const resolveAgentVersion = (driver: AgentDriver): string => {
  const cached = cachedVersions.get(driver.id);

  if (cached !== undefined) {
    return cached;
  }

  const version = probeVersion(driver);

  cachedVersions.set(driver.id, version);

  return version;
};
