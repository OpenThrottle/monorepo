import type { RenderHookResult } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

import { buildPlanRunConfigJson } from '../../testing/plan-run-config';
import type {
  UsePlanRunDialogOptions,
  UsePlanRunDialogResult,
} from '../usePlanRunDialog';
import { usePlanRunDialog } from '../usePlanRunDialog';

const NOW = new Date('2026-11-02T20:00:00.000Z');

describe('usePlanRunDialog', () => {
  let options: UsePlanRunDialogOptions;

  // useFetcher needs a router; the stub renders the hook's probe inside one.
  const renderDialogHook = (
    hookOptions: UsePlanRunDialogOptions,
  ): RenderHookResult<UsePlanRunDialogResult, unknown> => {
    return renderHook(() => usePlanRunDialog(hookOptions), {
      wrapper: ({ children }) => {
        const RoutesStub = createRoutesStub([
          { Component: () => <>{children}</>, path: '/' },
        ]);

        return <RoutesStub />;
      },
    });
  };

  beforeAll(() => {
    process.env.TZ = 'America/Los_Angeles';
  });

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    options = {
      branch: 'feat/x',
      checkoutId: 'checkout-1',
      jobRunHooksJson: '',
      mode: 'run',
      onOpenChange: vi.fn(),
      onSubmitted: vi.fn(),
      open: true,
      planId: 'plan-1',
      planStatus: 'PENDING',
      ralphTuningJson: '',
      repositoryId: '',
      runConfigJson: buildPlanRunConfigJson({
        executionBackend: 'claude',
        iterations: 3,
        model: 'opus',
      }),
      scheduledRunAt: null,
      workflowRunBlocked: false,
      workflowRunBlockedReason: undefined,
      workingDirectory: '',
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('starts from the plan run config and is submittable', () => {
    const { result } = renderDialogHook(options);

    expect(result.current.draft).toMatchObject({
      backend: 'claude',
      iterationsText: '3',
      mode: 'run',
      model: 'opus',
    });
    expect(result.current.planIterations).toBe(3);
    expect(result.current.blockedReason).toBeNull();
  });

  test('picking a model writes backend + model together and drops an unsupported effort', () => {
    options = {
      ...options,
      runConfigJson: buildPlanRunConfigJson({
        effort: 'high',
        executionBackend: 'claude',
      }),
    };
    const { result } = renderDialogHook(options);

    act(() =>
      result.current.onModelChange({ backend: 'cursor', model: 'gpt-5' }),
    );

    expect(result.current.draft).toMatchObject({
      backend: 'cursor',
      effort: '',
      model: 'gpt-5',
    });
    expect(result.current.fields).toMatchObject({
      backend: 'cursor',
      model: 'gpt-5',
    });
    expect(result.current.fields).not.toHaveProperty('effort');
  });

  test('names the schedule error for a past instant', () => {
    const { result } = renderDialogHook({ ...options, mode: 'schedule' });

    act(() => result.current.onScheduleTimeChange('09:00'));

    expect(result.current.scheduleError).toContain('already passed');
    expect(result.current.blockedReason).toContain('already passed');
    expect(result.current.scheduleSummary).toBeUndefined();
  });

  test('a scheduled plan seeds the schedule from its current time and asks before posting', () => {
    const { result } = renderDialogHook({
      ...options,
      mode: 'schedule',
      planStatus: 'SCHEDULED',
      scheduledRunAt: '2026-11-03T21:00:00.000Z',
    });

    expect(result.current.draft.scheduleTime).toBe('13:00');
    expect(result.current.fields.scheduledFor).toBe('2026-11-03T21:00:00.000Z');
    expect(result.current.confirm.confirmOpen).toBe(false);

    let asked = false;
    act(() => {
      asked = result.current.confirm.requestConfirm();
    });

    expect(asked).toBe(true);
    expect(result.current.confirm.confirmOpen).toBe(true);
  });

  test('an unscheduled plan posts without asking', () => {
    const { result } = renderDialogHook(options);

    let asked = true;
    act(() => {
      asked = result.current.confirm.requestConfirm();
    });

    expect(asked).toBe(false);
    expect(result.current.confirm.confirmOpen).toBe(false);
  });
});
