import { describe, expect, it } from 'vitest';

import {
  OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV,
  formatPlansProcessorSpawnOtDiagnosticsMessage,
} from '../ot-diagnostics';

describe('ot-diagnostics', () => {
  it('formatPlansProcessorSpawnOtDiagnosticsMessage returns null when diagnostics disabled', () => {
    expect(
      formatPlansProcessorSpawnOtDiagnosticsMessage({
        jobId: 'j1',
        planId: 'p1',
        queueLabel: 'plans',
        spawnCwd: '/repo',
        workerEnv: {},
      }),
    ).toBeNull();
  });

  it('formatPlansProcessorSpawnOtDiagnosticsMessage returns null when diagnostics env is off', () => {
    expect(
      formatPlansProcessorSpawnOtDiagnosticsMessage({
        jobId: 'j1',
        planId: 'p1',
        queueLabel: 'plans',
        spawnCwd: '/repo',
        workerEnv: {
          [OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV]: '0',
        },
      }),
    ).toBeNull();
  });

  it('formatPlansProcessorSpawnOtDiagnosticsMessage includes auth context hints when enabled', () => {
    const line = formatPlansProcessorSpawnOtDiagnosticsMessage({
      jobId: 'j1',
      planId: 'p1',
      queueLabel: 'workflow',
      spawnCwd: '/repo',
      workerEnv: {
        ANTHROPIC_API_KEY: 'sk-test',
        HOME: '/home/w',
        [OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV]: '1',
        POSTGRES_URL: 'postgresql://u:p@localhost:5432/db',
        USER: 'wuser',
        WORKSPACE_ROOT: '/repo',
      },
    });

    expect(line).not.toBeNull();
    expect(line).toContain('[plans-spawn:ot-diagnostics]');

    const brace = line!.indexOf('{');
    const parsed = JSON.parse(line!.slice(brace)) as {
      envPresence: { anthropicApiKeySet: boolean };
      home: string;
      postgresIdentity: string;
      unixUser: string;
    };

    expect(parsed.home).toBe('/home/w');
    expect(parsed.unixUser).toBe('wuser');
    expect(parsed.envPresence.anthropicApiKeySet).toBe(true);
    expect(parsed.postgresIdentity).toBe('postgresql://u@localhost:5432/db');
    expect(parsed.postgresIdentity).not.toContain(':p@');
  });
});
