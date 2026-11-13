import { afterEach, describe, expect, it } from 'vitest';

import { applyWorkflowRalphDebugCli } from '../applyWorkflowRalphDebugCli';
import { ralphDebugLogger, setRalphDebugLevel } from '../ralphDebugLogger';

afterEach(() => {
  setRalphDebugLevel('off');
});

describe('applyWorkflowRalphDebugCli', () => {
  it('maps omit to off', () => {
    applyWorkflowRalphDebugCli('omit');

    expect(ralphDebugLogger.level).toBe('off');
  });

  it('maps debug to debug', () => {
    applyWorkflowRalphDebugCli('debug');

    expect(ralphDebugLogger.level).toBe('debug');
  });

  it('maps verbose to verbose', () => {
    applyWorkflowRalphDebugCli('verbose');

    expect(ralphDebugLogger.level).toBe('verbose');
  });
});
