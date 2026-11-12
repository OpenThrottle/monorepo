import { describe, expect, it } from 'vitest';

import { getWorkflowRunBlockedReason } from '../getWorkflowRunBlockedReason';

const base = {
  jobRunHooksBlocked: false,
  jobRunHooksIssue: undefined,
  resolvingWorkspaceReason: 'Resolving workspace',
  runConfigSaveBlockedReason: 'Config invalid',
  workspaceRepositoriesReady: true,
};

describe('getWorkflowRunBlockedReason', () => {
  it('prefers the resolving reason while the workspace is loading', () => {
    expect(
      getWorkflowRunBlockedReason({
        ...base,
        jobRunHooksBlocked: true,
        workspaceRepositoriesReady: false,
      }),
    ).toBe('Resolving workspace');
  });

  it('reports the first job-run-hooks issue when hooks are blocked', () => {
    expect(
      getWorkflowRunBlockedReason({
        ...base,
        jobRunHooksBlocked: true,
        jobRunHooksIssue: 'Hook 1 is empty',
      }),
    ).toBe('Hook 1 is empty');
  });

  it('falls back to a generic hooks message without an issue', () => {
    expect(
      getWorkflowRunBlockedReason({ ...base, jobRunHooksBlocked: true }),
    ).toBe('Fix job run lifecycle hooks in Configuration.');
  });

  it('otherwise returns the run config reason', () => {
    expect(getWorkflowRunBlockedReason(base)).toBe('Config invalid');
  });
});
