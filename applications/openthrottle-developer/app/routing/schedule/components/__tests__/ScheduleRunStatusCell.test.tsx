import { render, type RenderResult } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_RUN_STATUS_CELL_COPY } from '~/routing/schedule/data/data.copy';
import { RUN_STATUS_LABEL } from '~/routing/schedule/data/data.run-status';

import {
  ScheduleRunStatusCell,
  type ScheduleRunStatusCellProps,
} from '../ScheduleRunStatusCell';

const RESETS_AT = '2026-11-01T17:00:00.000Z';
const USAGE_LIMITED_LABEL = RUN_STATUS_LABEL.usage_limited ?? 'usage_limited';

const renderCell = (
  overrides: Partial<ScheduleRunStatusCellProps> = {},
): RenderResult =>
  render(
    <ScheduleRunStatusCell
      errorMessage={null}
      resumeScheduled={false}
      status="succeeded"
      usageLimitResetsAt={null}
      {...overrides}
    />,
  );

describe('ScheduleRunStatusCell Component', () => {
  test('renders an ordinary status as a badge with no reset line', () => {
    const component = renderCell({ errorMessage: 'kaboom', status: 'failed' });

    expect(component.getByText('failed')).toHaveAttribute('title', 'kaboom');
    expect(component.queryByText(USAGE_LIMITED_LABEL)).toBeNull();
    expect(component.container.querySelector('time')).toBeNull();
  });

  describe('usage_limited', () => {
    test('badges the run in amber, not red', () => {
      const component = renderCell({
        status: 'usage_limited',
        usageLimitResetsAt: RESETS_AT,
      });

      const badge = component.getByText(USAGE_LIMITED_LABEL);
      expect(badge.className).toContain('amber');
      expect(badge.className).not.toContain('red');
      expect(component.queryByText('usage_limited')).toBeNull();
    });

    test('shows a local-time "resumes" line when a continuation exists', () => {
      const component = renderCell({
        resumeScheduled: true,
        status: 'usage_limited',
        usageLimitResetsAt: RESETS_AT,
      });

      expect(component.container.textContent).toContain(
        SCHEDULE_RUN_STATUS_CELL_COPY.resumesPrefix,
      );
      expect(component.container.querySelector('time')?.dateTime).toBe(
        RESETS_AT,
      );
      expect(
        component.queryByText(SCHEDULE_RUN_STATUS_CELL_COPY.notResumedSuffix),
      ).toBeNull();
    });

    test('says the run was not resumed automatically when no continuation exists', () => {
      const component = renderCell({
        status: 'usage_limited',
        usageLimitResetsAt: RESETS_AT,
      });

      expect(component.container.textContent).toContain(
        SCHEDULE_RUN_STATUS_CELL_COPY.resetsPrefix,
      );
      expect(
        component.getByText(SCHEDULE_RUN_STATUS_CELL_COPY.notResumedSuffix),
      ).toBeInTheDocument();
    });

    test('falls back to an unknown-reset line when the reset time is missing or unparseable', () => {
      const missing = renderCell({ status: 'usage_limited' });
      expect(
        missing.getByText(SCHEDULE_RUN_STATUS_CELL_COPY.resetUnknown),
      ).toBeInTheDocument();
      missing.unmount();

      const garbage = renderCell({
        status: 'usage_limited',
        usageLimitResetsAt: 'not-a-date',
      });
      expect(
        garbage.getByText(SCHEDULE_RUN_STATUS_CELL_COPY.resetUnknown),
      ).toBeInTheDocument();
      expect(garbage.container.querySelector('time')).toBeNull();
    });
  });
});
