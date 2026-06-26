import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';

import { loadWorkflowRalphConfig } from '../load-workflow-ralph-config.ts';
import { mergePlanRunTuningWithWorkflowRalphConfig } from '../merge-plan-run-tuning-with-config.ts';
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
