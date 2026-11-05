import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { SCHEDULE_KIND_OPTIONS } from '~/routing/schedule/data/data.schedule-kind';

import type { ScheduleKindFieldsProps } from '../ScheduleKindFields';
import { ScheduleKindFields } from '../ScheduleKindFields';

const optionLabel = (value: string): string => {
  return (
    SCHEDULE_KIND_OPTIONS.find((option) => option.value === value)?.label ?? ''
  );
};

const baseJob: NonNullable<ScheduleKindFieldsProps['job']> = {
  cronPattern: null,
  intervalMs: null,
  misfirePolicy: 'skip',
  misfireThresholdMs: 600_000,
  runAt: null,
  scheduleKind: 'cron',
};

describe('ScheduleKindFields Component', () => {
  let component: RenderResult;

  describe('when creating a schedule', () => {
    test('starts on cron, with the cron field and the late-run settings', () => {
      component = render(<ScheduleKindFields job={undefined} />);

      expect(
        component.getByRole('combobox', { name: SCHEDULE_COPY.kindLabel }),
      ).toHaveTextContent(optionLabel('cron'));
      expect(component.getByLabelText(SCHEDULE_COPY.cronLabel)).toHaveAttribute(
        'name',
        'cronPattern',
      );
      expect(
        component.getByTestId('ScheduleMisfireFields'),
      ).toBeInTheDocument();
    });
  });

  describe('when the schedule is an interval', () => {
    test('shows the interval in minutes, with no cron or late-run fields', () => {
      component = render(
        <ScheduleKindFields
          job={{
            ...baseJob,
            intervalMs: 45 * 60_000,
            scheduleKind: 'interval',
          }}
        />,
      );

      expect(component.getByLabelText(SCHEDULE_COPY.intervalLabel)).toHaveValue(
        45,
      );
      expect(
        component.getByLabelText(SCHEDULE_COPY.intervalLabel),
      ).toHaveAttribute('name', 'intervalMinutes');
      expect(
        component.queryByLabelText(SCHEDULE_COPY.cronLabel),
      ).not.toBeInTheDocument();
      expect(
        component.queryByTestId('ScheduleMisfireFields'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the schedule runs once', () => {
    test('pre-fills the ISO time', () => {
      component = render(
        <ScheduleKindFields
          job={{
            ...baseJob,
            runAt: '2026-11-03T17:00:00.000Z',
            scheduleKind: 'once',
          }}
        />,
      );

      expect(component.getByLabelText(SCHEDULE_COPY.runAtLabel)).toHaveValue(
        '2026-11-03T17:00:00.000Z',
      );
    });
  });

  describe('when the user switches the kind', () => {
    test('swaps the cron field for the chosen kind', async () => {
      const user = userEvent.setup();
      component = render(<ScheduleKindFields job={undefined} />);

      await user.click(
        component.getByRole('combobox', { name: SCHEDULE_COPY.kindLabel }),
      );
      await user.click(
        component.getByRole('option', { name: optionLabel('interval') }),
      );

      await waitFor(() => {
        expect(
          component.getByLabelText(SCHEDULE_COPY.intervalLabel),
        ).toBeInTheDocument();
      });
      expect(
        component.queryByLabelText(SCHEDULE_COPY.cronLabel),
      ).not.toBeInTheDocument();
    });
  });
});
