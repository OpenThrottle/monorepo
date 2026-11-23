import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { mergePlanRunTuningWithConfig } from '../mergePlanRunTuningWithConfig.ts';
import { loadPlanRunConfig } from '../plan-run-config.ts';
import { writePlanRunDefaults } from './writePlanRunDefaults.ts';

describe('mergePlanRunTuningWithConfig', () => {
  let dir: string;

  afterEach(() => {
    if (dir !== undefined) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('uses file defaults when enqueue tuning omits fields', () => {
    dir = mkdtempSync(join(tmpdir(), 'plan-run-merge-'));
    writePlanRunDefaults(dir, {
      iterationTimeout: 7,
      model: 'from-file',
      worktreeBase: 'develop',
    });

    const config = loadPlanRunConfig(dir, {});
    const merged = mergePlanRunTuningWithConfig({}, config);

    expect(merged.iterationTimeoutSeconds).toBe(7);
    expect(merged.model).toBe('from-file');
    expect(merged.worktreeBase).toBe('develop');
    expect(merged.debug).toBe('omit');
  });

  it('passes effort through (enqueue-only; no file or env layer)', () => {
    dir = mkdtempSync(join(tmpdir(), 'plan-run-merge-'));
    const config = loadPlanRunConfig(dir, {});

    expect(mergePlanRunTuningWithConfig({ effort: 'max' }, config).effort).toBe(
      'max',
    );
    expect(mergePlanRunTuningWithConfig({}, config).effort).toBeUndefined();
  });

  it('enqueue tuning overrides file defaults', () => {
    dir = mkdtempSync(join(tmpdir(), 'plan-run-merge-'));
    writePlanRunDefaults(dir, { iterationTimeout: 7, model: 'from-file' });

    const config = loadPlanRunConfig(dir, {});
    const merged = mergePlanRunTuningWithConfig(
      { debug: 'verbose', iterationTimeoutSeconds: 3 },
      config,
    );

    expect(merged.iterationTimeoutSeconds).toBe(3);
    expect(merged.model).toBe('from-file');
    expect(merged.debug).toBe('verbose');
  });
});
