import type { RenderResult } from '@testing-library/react';
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { PLAN_SCHEDULE_CONFIRM_COPY } from '~/routing/plans/data/data.copy';
import { formatPlanScheduledFor } from '~/routing/plans/utils/formatPlanScheduledFor';

import type { PlanUnscheduleActionProps } from '../PlanUnscheduleAction';
import { PlanUnscheduleAction } from '../PlanUnscheduleAction';

const SCHEDULED_AT = '2026-11-08T17:00:00.000Z';

describe('PlanUnscheduleAction Component', () => {
  let component: RenderResult;
  let props: PlanUnscheduleActionProps;
  let submitted: Record<string, FormDataEntryValue | null>[];

  const openConfirm = async (
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<HTMLElement> => {
    await user.click(
      component.getByRole('button', {
        name: PLAN_SCHEDULE_CONFIRM_COPY.unscheduleLabel,
      }),
    );

    return component.getByRole('alertdialog');
  };

  beforeEach(() => {
    submitted = [];
    props = {
      className: undefined,
      planId: 'plan-1',
      scheduledRunAt: SCHEDULED_AT,
    };

    const RoutesStub = createRoutesStub([
      {
        Component: () => {
          return <PlanUnscheduleAction {...props} />;
        },
        action: async ({ request }: { request: Request }) => {
          const formData = await request.formData();
          submitted.push({
            intent: formData.get('intent'),
            planId: formData.get('planId'),
            status: formData.get('status'),
          });
          return {};
        },
        path: '/',
      },
    ]);

    component = render(<RoutesStub />);
  });

  test('asks "This will unschedule the run at <time>" before submitting anything', async () => {
    const dialog = await openConfirm(userEvent.setup());

    expect(dialog).toHaveAccessibleDescription(
      PLAN_SCHEDULE_CONFIRM_COPY.unscheduleBody(
        formatPlanScheduledFor(SCHEDULED_AT),
      ),
    );
    expect(submitted).toHaveLength(0);
  });

  test('yes sets the plan back to PENDING', async () => {
    const user = userEvent.setup();
    const dialog = await openConfirm(user);

    await user.click(
      within(dialog).getByRole('button', {
        name: PLAN_SCHEDULE_CONFIRM_COPY.unscheduleConfirmLabel,
      }),
    );

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({
      intent: 'setPlanStatus',
      planId: 'plan-1',
      status: 'PENDING',
    });
  });

  test('keeping it scheduled submits nothing', async () => {
    const user = userEvent.setup();
    const dialog = await openConfirm(user);

    await user.click(
      within(dialog).getByRole('button', {
        name: PLAN_SCHEDULE_CONFIRM_COPY.keepLabel,
      }),
    );

    expect(component.queryByRole('alertdialog')).toBeNull();
    expect(submitted).toHaveLength(0);
  });
});
