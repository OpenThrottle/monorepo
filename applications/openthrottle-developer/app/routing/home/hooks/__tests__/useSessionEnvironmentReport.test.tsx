import { renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import type { UseSessionEnvironmentReportOptions } from '../useSessionEnvironmentReport';
import { useSessionEnvironmentReport } from '../useSessionEnvironmentReport';

const buildOptions = (
  overrides: Partial<UseSessionEnvironmentReportOptions> = {},
): UseSessionEnvironmentReportOptions => {
  return {
    checkouts: [{ defaultBranch: undefined, id: 'c1', label: 'monorepo' }],
    modelGroups: [{ id: 'claude', label: 'Claude Code' }],
    modelId: 'm1',
    models: [{ groupId: 'claude', id: 'm1', label: 'Opus' }],
    onEnvironmentChange: undefined,
    permissionMode: undefined,
    reasoning: undefined,
    repositoryIds: ['c1'],
    ...overrides,
  };
};

describe('useSessionEnvironmentReport', () => {
  test('reports the selected model, its agent and the primary checkout', () => {
    const onEnvironmentChange = vi.fn();

    renderHook(() => {
      useSessionEnvironmentReport(buildOptions({ onEnvironmentChange }));
    });

    expect(onEnvironmentChange).toHaveBeenCalledWith({
      agentLabel: 'Claude Code',
      checkout: { id: 'c1', label: 'monorepo' },
      modelLabel: 'Opus',
      permissionMode: undefined,
      reasoning: undefined,
    });
  });

  test('reports undefined labels when nothing is selected', () => {
    const onEnvironmentChange = vi.fn();

    renderHook(() => {
      useSessionEnvironmentReport(
        buildOptions({
          modelId: undefined,
          onEnvironmentChange,
          repositoryIds: [],
        }),
      );
    });

    expect(onEnvironmentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        agentLabel: undefined,
        checkout: undefined,
        modelLabel: undefined,
      }),
    );
  });

  test('does nothing without a listener', () => {
    expect(() => {
      renderHook(() => {
        useSessionEnvironmentReport(buildOptions());
      });
    }).not.toThrow();
  });
});
