import { toast } from '@openthrottle/react-router-shadcn';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';
import { getRecentWorkspacePaths } from '~/routing/plans/utils/workspace-path';

import type { UsePlanToolbarRunDialogOptions } from '../usePlanToolbarRunDialog';
import { usePlanToolbarRunDialog } from '../usePlanToolbarRunDialog';

vi.mock('@openthrottle/react-router-shadcn', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const successMock = vi.mocked(toast.success);

describe('usePlanToolbarRunDialog', () => {
  let options: UsePlanToolbarRunDialogOptions;

  beforeEach(() => {
    successMock.mockClear();
    options = { workingDirectory: '/repo/checkout' };
  });

  test('starts closed on the run tab', () => {
    const { result } = renderHook(() => usePlanToolbarRunDialog(options));

    expect(result.current.open).toBe(false);
    expect(result.current.mode).toBe('run');
    expect(result.current.repositories).toEqual([]);
  });

  test('onOpenDialog opens the dialog on the requested tab', () => {
    const { result } = renderHook(() => usePlanToolbarRunDialog(options));

    act(() => result.current.onOpenDialog('schedule'));

    expect(result.current.open).toBe(true);
    expect(result.current.mode).toBe('schedule');

    act(() => result.current.onOpenChange(false));
    act(() => result.current.onOpenDialog('run'));

    expect(result.current.open).toBe(true);
    expect(result.current.mode).toBe('run');
  });

  test('resolves the deferred repositories', async () => {
    const repositories: PlanRunConfigRepositoryFieldsFragment[] = [];
    const { result } = renderHook(() =>
      usePlanToolbarRunDialog({
        ...options,
        repositories: Promise.resolve(repositories),
      }),
    );

    await waitFor(() => expect(result.current.repositories).toBe(repositories));
  });

  test('a run-now submission toasts the job id and records the workspace path', () => {
    const { result } = renderHook(() => usePlanToolbarRunDialog(options));

    act(() =>
      result.current.onSubmitted({
        mode: 'run',
        result: {
          executionBackend: 'claude',
          jobId: 'job-42',
          planId: 'plan-1',
          queuePosition: 1,
          queueTotal: 1,
        },
      }),
    );

    expect(successMock).toHaveBeenCalledWith(PLAN_TOOLBAR_COPY.runQueuedToast, {
      description: expect.stringContaining('Job job-42.'),
    });
    expect(getRecentWorkspacePaths()).toContain('/repo/checkout');
  });

  test('a scheduled submission toasts the fire time in local time', () => {
    const { result } = renderHook(() => usePlanToolbarRunDialog(options));
    const scheduledFor = '2026-11-03T21:00:00.000Z';
    const localTime = new Date(scheduledFor).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    act(() =>
      result.current.onSubmitted({
        mode: 'schedule',
        result: {
          executionBackend: 'claude',
          jobId: 'job-7',
          planId: 'plan-1',
          planRunId: 'run-7',
          scheduledFor,
        },
      }),
    );

    expect(successMock).toHaveBeenCalledWith(
      PLAN_TOOLBAR_COPY.runScheduledToast,
      {
        description: PLAN_TOOLBAR_COPY.runScheduledToastDescription(localTime),
      },
    );
  });
});
