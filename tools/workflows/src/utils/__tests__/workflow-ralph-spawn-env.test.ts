import { describe, expect, it } from 'vitest';

import {
  OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV,
  buildWorkflowRalphSpawnEnv,
  WORKFLOW_RALPH_SPAWN_HOME_ENV,
  WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV,
} from '../../../../../packages/ai-mcp/src/config';

describe('buildWorkflowRalphSpawnEnv', () => {
  it('returns the same env reference when postgres is unresolved and spawn overrides are absent', () => {
    const env: NodeJS.ProcessEnv = { FOO: 'bar' };
    expect(buildWorkflowRalphSpawnEnv(env)).toBe(env);
  });

  it('sets HOME from WORKFLOW_RALPH_SPAWN_HOME when set', () => {
    const out = buildWorkflowRalphSpawnEnv({
      HOME: '/worker',
      [WORKFLOW_RALPH_SPAWN_HOME_ENV]: '/mounted',
    });

    expect(out.HOME).toBe('/mounted');
    expect(out).not.toBe(process.env);
  });

  it('merges canonical postgres URL with HOME and XDG overrides', () => {
    const out = buildWorkflowRalphSpawnEnv(
      {
        HOME: '/w',
        POSTGRES_URL: 'postgresql://a:b@localhost:1/db',
        [WORKFLOW_RALPH_SPAWN_HOME_ENV]: '/vault',
        [WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV]: '/xdg',
      },
      { canonicalCortexPostgresUrl: 'postgresql://c:d@localhost:2/db2' },
    );

    expect(out.HOME).toBe('/vault');
    expect(out.XDG_CONFIG_HOME).toBe('/xdg');
    expect(out.POSTGRES_URL).toBe('postgresql://c:d@localhost:2/db2');
    expect(out[OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV]).toBe(
      'postgresql://c:d@localhost:2/db2',
    );
  });

  it('does not override HOME when WORKFLOW_RALPH_SPAWN_HOME is blank after trim', () => {
    const env: NodeJS.ProcessEnv = {
      HOME: '/keep',
      [WORKFLOW_RALPH_SPAWN_HOME_ENV]: '   ',
    };

    const out = buildWorkflowRalphSpawnEnv(env);

    expect(out.HOME).toBe('/keep');
    expect(out).toBe(env);
  });
});
