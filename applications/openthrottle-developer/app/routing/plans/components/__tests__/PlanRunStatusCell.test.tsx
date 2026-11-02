import { render, type RenderResult } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { PLAN_RUN_STATUS_CELL_COPY } from '~/routing/plans/data/data.copy';

import {
  PlanRunStatusCell,
  type PlanRunStatusCellProps,
} from '../PlanRunStatusCell';

const RESETS_AT = '2026-11-01T17:00:00.000Z';

const renderCell = (
  overrides: Partial<PlanRunStatusCellProps> = {},
): RenderResult =>
  render(
    <PlanRunStatusCell
      resumeOfRunId={null}
      resumeScheduled={false}
      status="COMPLETED"
      usageLimitResetsAt={null}
      {...overrides}
    />,
  );

describe('PlanRunStatusCell Component', () => {
  test('renders an ordinary status as plain text with no usage-limit badge', () => {
    const component = renderCell({ status: 'COMPLETED' });

    expect(component.getByText('COMPLETED')).toBeInTheDocument();
    expect(
      component.queryByText(PLAN_RUN_STATUS_CELL_COPY.usageLimitedBadge),
    ).toBeNull();
  });

  test('badges a continuation run as resumed', () => {
    const component = renderCell({
      resumeOfRunId: 'run-limited',
      status: 'IN_PROGRESS',
    });

    expect(
      component.getByText(PLAN_RUN_STATUS_CELL_COPY.resumedBadge),
    ).toBeInTheDocument();
  });

  describe('USAGE_LIMITED', () => {
    test('shows the badge and a local-time "resumes" line when a continuation exists', () => {
      const component = renderCell({
        resumeScheduled: true,
        status: 'USAGE_LIMITED',
        usageLimitResetsAt: RESETS_AT,
      });

      expect(
        component.getByText(PLAN_RUN_STATUS_CELL_COPY.usageLimitedBadge),
      ).toBeInTheDocument();
      expect(component.container.textContent).toContain(
        PLAN_RUN_STATUS_CELL_COPY.resumesPrefix,
      );
      expect(component.container.querySelector('time')?.dateTime).toBe(
        RESETS_AT,
      );
      expect(
        component.queryByText(PLAN_RUN_STATUS_CELL_COPY.notResumedSuffix),
      ).toBeNull();
    });

    test('says the plan was not resumed automatically when no continuation exists', () => {
      const component = renderCell({
        status: 'USAGE_LIMITED',
        usageLimitResetsAt: RESETS_AT,
      });

      expect(component.container.textContent).toContain(
        PLAN_RUN_STATUS_CELL_COPY.resetsPrefix,
      );
      expect(
        component.getByText(PLAN_RUN_STATUS_CELL_COPY.notResumedSuffix),
      ).toBeInTheDocument();
    });

    test('falls back to an unknown-reset line when the reset time is missing or unparseable', () => {
      const missing = renderCell({ status: 'USAGE_LIMITED' });
      expect(
        missing.getByText(PLAN_RUN_STATUS_CELL_COPY.resetUnknown),
      ).toBeInTheDocument();
      missing.unmount();

      const garbage = renderCell({
        status: 'USAGE_LIMITED',
        usageLimitResetsAt: 'not-a-date',
      });
      expect(
        garbage.getByText(PLAN_RUN_STATUS_CELL_COPY.resetUnknown),
      ).toBeInTheDocument();
      expect(garbage.container.querySelector('time')).toBeNull();
    });
  });
});
