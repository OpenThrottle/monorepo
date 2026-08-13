import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub, useFetcher } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanToolbarStatusAction } from '../PlanToolbarStatusAction';
import type { PlanToolbarStatusActionProps } from '../PlanToolbarStatusAction';
import type { action } from '~/routes/plans.$planId._index';

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
    props = { isCompleted: false, isRunning: false, planId: 'plan-1' };
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
    props = { isCompleted: true, isRunning: false, planId: 'plan-1' };
    setup();

    expect(
      component.getByRole('button', { name: 'Mark Complete' }),
    ).toBeDisabled();
  });

  test('disables the button when the plan is running', () => {
    component.unmount();
    props = { isCompleted: false, isRunning: true, planId: 'plan-1' };
    setup();

    expect(
      component.getByRole('button', { name: 'Mark Complete' }),
    ).toBeDisabled();
  });
});
