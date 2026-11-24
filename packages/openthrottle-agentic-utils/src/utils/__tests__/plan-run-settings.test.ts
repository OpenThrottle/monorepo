/**
 * @description Tests for {@link mergePlanRunTuningWithDriver}.
 */

import { describe, expect, it } from 'vitest';

import type { WorkflowConfigDebug } from '../../types/workflow-config.ts';
import { mergePlanRunTuningWithDriver } from '../plan-run-settings.ts';

/**
 * @description Presents a legacy uppercase debug value (e.g. persisted `DEBUG`/`VERBOSE`)
 * as a {@link WorkflowConfigDebug} so tests exercise runtime normalization without a cast.
 */
function legacyDebugValue(value: string): WorkflowConfigDebug;
function legacyDebugValue(value: string): string {
  return value;
}

describe('mergePlanRunTuningWithDriver', () => {
  it('fills driver from the job driver when tuning omits driver', () => {
    expect(mergePlanRunTuningWithDriver(undefined, 'claude')).toEqual({
      driver: 'claude',
    });
  });

  it('prefers an explicit tuning driver over the job driver', () => {
    expect(
      mergePlanRunTuningWithDriver(
        { driver: 'cursor', iterationTimeoutSeconds: 2 },
        'claude',
      ),
    ).toEqual({ driver: 'cursor', iterationTimeoutSeconds: 2 });
  });

  it('defaults to cursor when both are absent', () => {
    expect(mergePlanRunTuningWithDriver(undefined, undefined)).toEqual({
      driver: 'cursor',
    });
  });

  it('normalizes legacy uppercase debug on merge', () => {
    expect(
      mergePlanRunTuningWithDriver(
        { debug: legacyDebugValue('VERBOSE') },
        'cursor',
      ),
    ).toEqual({ debug: 'verbose', driver: 'cursor' });
  });
});
