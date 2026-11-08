import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useFetcher } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { action } from '~/routes/plans.$planId._index';
import { PLAN_SCHEDULE_CONFIRM_COPY } from '~/routing/plans/data/data.copy';
import { formatPlanScheduledFor } from '~/routing/plans/utils/format-plan-scheduled-for';

import type { PlanToolbarStatusActionProps } from '../PlanToolbarStatusAction';
import { PlanToolbarStatusAction } from '../PlanToolbarStatusAction';

type OwnProps = Omit<PlanToolbarStatusActionProps, 'fetcherSetPlanStatus'>;

const Harness = (props: OwnProps): React.ReactElement => {
  const fetcherSetPlanStatus = useFetcher<typeof action>();
  return (
    <TooltipProvider>
      <PlanToolbarStatusAction
        {...props}
        fetcherSetPlanStatus={fetcherSetPlanStatus}
      />
    </TooltipProvider>
  );
};

const SCHEDULED_AT = '2026-11-08T17:00:00.000Z';

const basePropsFor = (overrides: Partial<OwnProps> = {}): OwnProps => {
  return {
    isCompleted: false,
    isRunning: false,
    planId: 'plan-1',
    planStatus: 'PENDING',
    scheduledRunAt: null,
    ...overrides,
  };
};

describe('PlanToolbarStatusAction Component', () => {
  let component: RenderResult;
  let props: OwnProps;
  let submitted: Record<string, FormDataEntryValue | null>[];

  const setup = (): void => {
    const RoutesStub = createRoutesStub([
      {
        // eslint-disable-next-line react/no-multi-comp
        Component: () => <Harness {...props} />,
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
  };

  beforeEach(() => {
    submitted = [];
    props = basePropsFor();
    setup();
  });

  test('renders the Mark Complete button', () => {
    expect(
      component.getByRole('button', { name: 'Mark Complete' }),
    ).toBeInTheDocument();
  });

  test('submits the setPlanStatus intent with the planId', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Mark Complete' }));

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({
      intent: 'setPlanStatus',
      planId: 'plan-1',
      status: 'COMPLETED',
    });
  });

  test('disables the button when the plan is already completed', () => {
    component.unmount();
    props = basePropsFor({ isCompleted: true });
    setup();

    expect(
      component.getByRole('button', { name: 'Mark Complete' }),
    ).toBeDisabled();
  });

  test('disables the button when the plan is running', () => {
    component.unmount();
    props = basePropsFor({ isRunning: true });
    setup();

    expect(
      component.getByRole('button', { name: 'Mark Complete' }),
    ).toBeDisabled();
  });

  describe('on a SCHEDULED plan', () => {
    beforeEach(() => {
      component.unmount();
      props = basePropsFor({
        planStatus: 'SCHEDULED',
        scheduledRunAt: SCHEDULED_AT,
      });
      setup();
    });

    test('asks "This will unschedule the run at <time>" before submitting anything', async () => {
      const user = userEvent.setup();

      await user.click(
        component.getByRole('button', { name: 'Mark Complete' }),
      );

      expect(component.getByRole('alertdialog')).toHaveAccessibleDescription(
        PLAN_SCHEDULE_CONFIRM_COPY.statusUnschedule(
          formatPlanScheduledFor(SCHEDULED_AT),
        ),
      );
      expect(submitted).toHaveLength(0);
    });

    test('yes submits the status change', async () => {
      const user = userEvent.setup();

      await user.click(
        component.getByRole('button', { name: 'Mark Complete' }),
      );
      await user.click(
        component.getByRole('button', {
          name: PLAN_SCHEDULE_CONFIRM_COPY.statusConfirmLabel,
        }),
      );

      await waitFor(() => expect(submitted).toHaveLength(1));
      expect(submitted[0]).toEqual({
        intent: 'setPlanStatus',
        planId: 'plan-1',
        status: 'COMPLETED',
      });
    });

    test('keeping it scheduled submits nothing', async () => {
      const user = userEvent.setup();

      await user.click(
        component.getByRole('button', { name: 'Mark Complete' }),
      );
      await user.click(
        component.getByRole('button', {
          name: PLAN_SCHEDULE_CONFIRM_COPY.keepLabel,
        }),
      );

      expect(component.queryByRole('alertdialog')).toBeNull();
      expect(submitted).toHaveLength(0);
    });
  });

  test('a plan that is not scheduled submits with no confirm', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Mark Complete' }));

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(component.queryByRole('alertdialog')).toBeNull();
  });
});
