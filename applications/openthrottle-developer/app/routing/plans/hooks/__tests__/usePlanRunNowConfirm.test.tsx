import type { RenderResult } from '@testing-library/react';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useFetcher } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { action } from '~/routes/plans.$planId._index';

import type { UsePlanRunNowConfirmResult } from '../usePlanRunNowConfirm';
import { usePlanRunNowConfirm } from '../usePlanRunNowConfirm';

const FIELDS = { branch: 'main', intent: 'runPlan', ralphTuning: '' };

describe('usePlanRunNowConfirm', () => {
  let actionResult: unknown;
  let submitted: Record<string, string>[];
  let latest: UsePlanRunNowConfirmResult | undefined;

  // The probe owns the fetcher the way the toolbar does; the stub answers its posts.
  const renderProbe = (): RenderResult => {
    const Probe = (): React.ReactElement => {
      const fetcherRunPlan = useFetcher<typeof action>();
      latest = usePlanRunNowConfirm({ fetcherRunPlan, fields: FIELDS });

      return (
        <button
          onClick={() => {
            void fetcherRunPlan.submit(FIELDS, { method: 'post' });
          }}
          type="button"
        >
          plain run
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
    submitted = [];
    latest = undefined;
  });

  test('opens on request and closes again', () => {
    renderProbe();

    expect(latest?.open).toBe(false);
    act(() => latest?.onRequest());
    expect(latest?.open).toBe(true);
    act(() => latest?.onOpenChange(false));
    expect(latest?.open).toBe(false);
  });

  test('yes re-submits the same fields plus cancelScheduled and closes', async () => {
    renderProbe();

    act(() => latest?.onRequest());
    act(() => latest?.onConfirm());

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({ ...FIELDS, cancelScheduled: 'true' });
    expect(latest?.open).toBe(false);
  });

  test('opens by itself when the server answers PLAN_ALREADY_SCHEDULED, naming its time', async () => {
    const user = userEvent.setup();
    actionResult = {
      runPlanConflict: {
        code: 'PLAN_ALREADY_SCHEDULED',
        planRunId: 'run-1',
        scheduledFor: '2026-11-08T17:00:00.000Z',
      },
    };
    const component = renderProbe();

    await user.click(component.getByRole('button', { name: 'plain run' }));

    await waitFor(() => expect(latest?.open).toBe(true));
    expect(latest?.serverScheduledFor).toBe('2026-11-08T17:00:00.000Z');
  });

  test('stays closed for an ordinary error', async () => {
    const user = userEvent.setup();
    actionResult = { runPlanError: 'redis is down' };
    const component = renderProbe();

    await user.click(component.getByRole('button', { name: 'plain run' }));

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(latest?.open).toBe(false);
  });
});
