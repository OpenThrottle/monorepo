import { afterEach, describe, expect, it } from 'vitest';

import { applyWorkflowRalphDebugCli } from '../apply-workflow-ralph-debug-cli';
import { ralphDebugLogger, setRalphDebugLevel } from '../ralph-debug-logger';

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
