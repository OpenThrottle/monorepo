import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PLAN_RUN_RESCHEDULE_COPY } from '~/routing/plans/data/data.copy';

import { PlanRunRescheduleButton } from '../PlanRunRescheduleButton';

const COPY = PLAN_RUN_RESCHEDULE_COPY;

const renderButton = () => {
  const Component = () => {
    return (
      <PlanRunRescheduleButton
        planId="plan-1"
        planRunId="run-9"
        scheduledFor={new Date(Date.now() + 86_400_000).toISOString()}
      />
    );
  };
  const RoutesStub = createRoutesStub([
    {
      Component,
      action: () => ({}),
      loader: () => null,
      path: '/plans/:planId',
    },
  ]);

  return render(<RoutesStub initialEntries={['/plans/plan-1']} />);
};

describe('PlanRunRescheduleButton Component', () => {
  test('renders an outline trigger and keeps the dialog closed', async () => {
    const component = renderButton();

    expect(
      await component.findByRole('button', { name: COPY.ariaLabel }),
    ).toBeInTheDocument();
    expect(component.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('opens the reschedule dialog on click', async () => {
    const user = userEvent.setup();
    const component = renderButton();

    await user.click(
      await component.findByRole('button', { name: COPY.ariaLabel }),
    );

    expect(
      await component.findByRole('heading', { name: COPY.dialogTitle }),
    ).toBeInTheDocument();
    expect(component.getByTestId('PlanRunDialogSchedule')).toBeInTheDocument();
  });
});
