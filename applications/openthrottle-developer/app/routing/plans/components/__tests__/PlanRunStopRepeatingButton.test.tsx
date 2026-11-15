import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_REPEAT_COPY } from '~/routing/plans/data/data.copy';

import { buildPlanRunSchedule } from '../../testing/buildPlanRunSchedule';
import { renderWithPlanRunSchedules } from '../../testing/renderWithPlanRunSchedules';
import { PlanRunStopRepeatingButton } from '../PlanRunStopRepeatingButton';

const { toastError, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: toastError, success: toastSuccess }),
}));

const COPY = PLAN_RUN_REPEAT_COPY;

describe('PlanRunStopRepeatingButton Component', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastSuccess.mockClear();
  });

  test('posts setPlanRunScheduleEnabled enabled=false for the schedule, not cancelPlanRun', async () => {
    const user = userEvent.setup();
    const submissions: FormData[] = [];
    const component = renderWithPlanRunSchedules(
      <PlanRunStopRepeatingButton planId="plan-1" planRunId="run-9" />,
      {
        action: (form) => {
          submissions.push(form);

          return { setPlanRunScheduleEnabled: { id: 'schedule-1' } };
        },
        schedules: [buildPlanRunSchedule()],
      },
    );

    await user.click(
      await component.findByRole('button', { name: COPY.stopAriaLabel }),
    );

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(COPY.stoppedToast),
    );
    expect(submissions).toHaveLength(1);
    expect(submissions[0]?.get('intent')).toBe('setPlanRunScheduleEnabled');
    expect(submissions[0]?.get('scheduleId')).toBe('schedule-1');
    expect(submissions[0]?.get('enabled')).toBe('false');
  });

  test('surfaces the server error', async () => {
    const user = userEvent.setup();
    const component = renderWithPlanRunSchedules(
      <PlanRunStopRepeatingButton planId="plan-1" planRunId="run-9" />,
      {
        action: () => ({ setPlanRunScheduleEnabledError: 'Nope' }),
        schedules: [buildPlanRunSchedule()],
      },
    );

    await user.click(
      await component.findByRole('button', { name: COPY.stopAriaLabel }),
    );

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Nope'));
  });

  test('renders nothing for a run that is not a schedule occurrence', async () => {
    const component = renderWithPlanRunSchedules(
      <PlanRunStopRepeatingButton planId="plan-1" planRunId="run-1" />,
      { schedules: [buildPlanRunSchedule()] },
    );

    await waitFor(() =>
      expect(
        component.queryByRole('button', { name: COPY.stopAriaLabel }),
      ).not.toBeInTheDocument(),
    );
  });
});
