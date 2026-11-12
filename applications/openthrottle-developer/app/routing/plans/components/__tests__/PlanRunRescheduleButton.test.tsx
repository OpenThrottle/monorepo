import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_RESCHEDULE_COPY } from '~/routing/plans/data/data.copy';

import { PlanRunRescheduleButton } from '../PlanRunRescheduleButton';

const COPY = PLAN_RUN_RESCHEDULE_COPY;

const NOW = new Date('2026-11-02T20:00:00.000Z');
const SCHEDULED_FOR = '2026-11-03T20:00:00.000Z';

const renderButton = () => {
  const Component = () => {
    return (
      <PlanRunRescheduleButton
        planId="plan-1"
        planRunId="run-9"
        scheduledFor={SCHEDULED_FOR}
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
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
