import type { RenderResult } from '@testing-library/react';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useFetcher } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { action } from '~/routes/plans.$planId._index';
import type { PlanRunDialogMode } from '~/routing/plans/types';

import type { UsePlanRunDialogConfirmResult } from '../usePlanRunDialogConfirm';
import { usePlanRunDialogConfirm } from '../usePlanRunDialogConfirm';

const SCHEDULED_AT = '2026-11-08T17:00:00.000Z';

describe('usePlanRunDialogConfirm', () => {
  let actionResult: unknown;
  let mode: PlanRunDialogMode;
  let open: boolean;
  let scheduledRunAt: string | null;
  let submitted: Record<string, string>[];
  let latest: UsePlanRunDialogConfirmResult | undefined;

  const renderProbe = (): RenderResult => {
    const fields = { branch: 'main', intent: 'runPlan' };
    const Probe = (): React.ReactElement => {
      const fetcher = useFetcher<typeof action>();
      latest = usePlanRunDialogConfirm({
        fetcher,
        fields,
        mode,
        open,
        scheduledRunAt,
      });

      return (
        <button
          onClick={() => {
            void fetcher.submit(fields, { method: 'post' });
          }}
          type="button"
        >
          plain submit
        </button>
      );
    };
    const RoutesStub = createRoutesStub([
      {
        Component: Probe,
        action: async ({ request }) => {
          const formData = await request.formData();
          submitted.push(
            Object.fromEntries(
              [...formData.entries()].map(([key, value]) => [
                key,
                typeof value === 'string' ? value : '',
              ]),
            ),
          );

          return actionResult;
        },
        path: '/',
      },
    ]);

    return render(<RoutesStub />);
  };

  beforeEach(() => {
    actionResult = null;
    mode = 'run';
    open = true;
    scheduledRunAt = SCHEDULED_AT;
    submitted = [];
    latest = undefined;
  });

  test('asks first when the plan is scheduled', () => {
    renderProbe();

    let asked = false;
    act(() => {
      asked = latest?.requestConfirm() ?? false;
    });

    expect(asked).toBe(true);
    expect(latest?.confirmOpen).toBe(true);
  });

  test('lets an unscheduled plan post without asking', () => {
    scheduledRunAt = null;
    renderProbe();

    let asked = true;
    act(() => {
      asked = latest?.requestConfirm() ?? true;
    });

    expect(asked).toBe(false);
    expect(latest?.confirmOpen).toBe(false);
  });

  test('on the Run tab, yes posts the fields with cancelScheduled', async () => {
    renderProbe();

    act(() => {
      latest?.requestConfirm();
    });
    act(() => latest?.onConfirm());

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({
      branch: 'main',
      cancelScheduled: 'true',
      intent: 'runPlan',
    });
    expect(latest?.confirmOpen).toBe(false);
  });

  test('on the Schedule tab, yes posts the fields with replaceScheduled', async () => {
    mode = 'schedule';
    renderProbe();

    act(() => latest?.onConfirm());

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toMatchObject({ replaceScheduled: 'true' });
    expect(submitted[0]).not.toHaveProperty('cancelScheduled');
  });

  test.each(['runPlanConflict', 'schedulePlanRunConflict'])(
    'opens by itself on a %s from the server and names its time',
    async (key) => {
      const user = userEvent.setup();
      scheduledRunAt = null;
      actionResult = {
        [key]: {
          code: 'PLAN_ALREADY_SCHEDULED',
          planRunId: 'run-1',
          scheduledFor: SCHEDULED_AT,
        },
      };
      const component = renderProbe();

      await user.click(component.getByRole('button', { name: 'plain submit' }));

      await waitFor(() => expect(latest?.confirmOpen).toBe(true));
      expect(latest?.serverScheduledFor).toBe(SCHEDULED_AT);
    },
  );
});
