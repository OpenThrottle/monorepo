import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV,
  formatPlansProcessorSpawnOtDiagnosticsMessage,
  logWorkflowRalphOtDiagnostics,
} from '../ot-diagnostics';
import { WORKFLOW_RALPH_DEFAULTS_FILENAME } from '../../config/workflow-ralph-defaults.types';

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

  it('formatPlansProcessorSpawnOtDiagnosticsMessage includes auth context hints when enabled via env', () => {
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
    const parsed: {
      envPresence: { anthropicApiKeySet: boolean };
      home: string;
      postgresIdentity: string;
      unixUser: string;
    } = JSON.parse(line!.slice(brace));

    expect(parsed.home).toBe('/home/w');
    expect(parsed.unixUser).toBe('wuser');
    expect(parsed.envPresence.anthropicApiKeySet).toBe(true);
    expect(parsed.postgresIdentity).toBe('postgresql://u@localhost:5432/db');
    expect(parsed.postgresIdentity).not.toContain(':p@');
  });

  it('formatPlansProcessorSpawnOtDiagnosticsMessage enables diagnostics.spawn from file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-spawn-diag-'));
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
        JSON.stringify({ diagnostics: { spawn: true } }),
        'utf8',
      );

      const line = formatPlansProcessorSpawnOtDiagnosticsMessage({
        jobId: 'j1',
        planId: 'p1',
        queueLabel: 'plans',
        spawnCwd: dir,
        workerEnv: { POSTGRES_URL: 'postgresql://u:p@localhost:5432/db' },
      });

      expect(line).not.toBeNull();
      expect(line).toContain('[plans-spawn:ot-diagnostics]');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('logWorkflowRalphOtDiagnostics', () => {
  const originalCwd = process.cwd();
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    process.chdir(originalCwd);
    vi.unstubAllEnvs();
    stderrSpy?.mockRestore();
  });

  it('does not log when diagnostics disabled in env and file absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-ot-diag-off-'));
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      process.chdir(dir);
      vi.stubEnv('WORKFLOW_RALPH_OT_DIAGNOSTICS', '');
      logWorkflowRalphOtDiagnostics({ planId: 'p1' });
      expect(stderrSpy).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('logs when diagnostics.ot is true in .workflow-ralph.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-ot-diag-'));
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
        JSON.stringify({ diagnostics: { ot: true } }),
        'utf8',
      );
      process.chdir(dir);
      logWorkflowRalphOtDiagnostics({ planId: 'p1' });
      expect(stderrSpy).toHaveBeenCalledOnce();
      expect(String(stderrSpy.mock.calls[0]?.[0])).toContain(
        '[workflow-ralph:ot-diagnostics]',
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
