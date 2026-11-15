import { describe, expect, test } from 'vitest';

import { buildPlanRunSchedule } from '../../testing/buildPlanRunSchedule';
import { renderWithPlanRunSchedules } from '../../testing/renderWithPlanRunSchedules';
import { PlanRunRepeatBadge } from '../PlanRunRepeatBadge';

describe('PlanRunRepeatBadge Component', () => {
  test('renders the human-readable rule of the occurrence’s schedule with its timezone', async () => {
    const component = renderWithPlanRunSchedules(
      <PlanRunRepeatBadge planRunId="run-9" />,
      { schedules: [buildPlanRunSchedule()] },
    );

    const badge = await component.findByTestId('PlanRunRepeatBadge');

    expect(badge).toHaveTextContent(
      /Repeats at 09:00 AM, Monday through Friday/,
    );
    expect(badge).toHaveAttribute('title', 'America/Los_Angeles');
  });

  test('renders nothing for a run no schedule owns', () => {
    const component = renderWithPlanRunSchedules(
      <PlanRunRepeatBadge planRunId="run-1" />,
      { schedules: [buildPlanRunSchedule()] },
    );

    expect(
      component.queryByTestId('PlanRunRepeatBadge'),
    ).not.toBeInTheDocument();
  });
});
