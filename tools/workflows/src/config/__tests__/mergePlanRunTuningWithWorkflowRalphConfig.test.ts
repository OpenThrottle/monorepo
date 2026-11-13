import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadWorkflowRalphConfig } from '../load-workflow-ralph-config.ts';
import { mergePlanRunTuningWithWorkflowRalphConfig } from '../mergePlanRunTuningWithWorkflowRalphConfig.ts';
import { WORKFLOW_RALPH_DEFAULTS_FILENAME } from '../workflow-ralph-defaults.types.ts';

describe('mergePlanRunTuningWithWorkflowRalphConfig', () => {
  let dir: string;

  afterEach(() => {
    if (dir !== undefined) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('uses file defaults when enqueue tuning omits fields', () => {
    dir = mkdtempSync(join(tmpdir(), 'ralph-merge-'));
    writeFileSync(
      join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
      JSON.stringify({
        iterations: 7,
        model: 'from-file',
        prompt: '/file-prompt',
      }),
    );

    const config = loadWorkflowRalphConfig(dir, {});
    const merged = mergePlanRunTuningWithWorkflowRalphConfig({}, config);

    expect(merged.iterations).toBe(7);
    expect(merged.model).toBe('from-file');
    expect(merged.prompt).toBe('/file-prompt');
    expect(merged.ralphDebugCli).toBe('omit');
  });

  it('passes effort through (enqueue-only; no file or env layer)', () => {
    dir = mkdtempSync(join(tmpdir(), 'ralph-merge-'));
    const config = loadWorkflowRalphConfig(dir, {});

    expect(
      mergePlanRunTuningWithWorkflowRalphConfig({ effort: 'max' }, config)
        .effort,
    ).toBe('max');
    expect(
      mergePlanRunTuningWithWorkflowRalphConfig({}, config).effort,
    ).toBeUndefined();
  });

  it('enqueue tuning overrides file defaults', () => {
    dir = mkdtempSync(join(tmpdir(), 'ralph-merge-'));
    writeFileSync(
      join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
      JSON.stringify({ iterations: 7, model: 'from-file' }),
    );

    const config = loadWorkflowRalphConfig(dir, {});
    const merged = mergePlanRunTuningWithWorkflowRalphConfig(
      { iterations: 3, ralphDebugCli: 'verbose' },
      config,
    );

    expect(merged.iterations).toBe(3);
    expect(merged.model).toBe('from-file');
    expect(merged.ralphDebugCli).toBe('verbose');
  });
});
