import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render, type RenderResult } from '@testing-library/react';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { PLAN_RUN_STATUS_CELL_COPY } from '~/routing/plans/data/data.copy';

import {
  PlanRunStatusCell,
  type PlanRunStatusCellProps,
} from '../PlanRunStatusCell';

const RESETS_AT = '2026-11-01T17:00:00.000Z';
const FIRES_AT = '2026-11-03T17:30:00.000Z';
const SETTLED_REASON = 'Plan had no runnable tasks at fire time.';

const renderCell = (
  overrides: Partial<PlanRunStatusCellProps> = {},
): RenderResult => {
  return render(
    <TooltipProvider>
      <PlanRunStatusCell
        resumeOfRunId={null}
        resumeScheduled={false}
        status="COMPLETED"
        usageLimitResetsAt={null}
        {...overrides}
      />
    </TooltipProvider>,
  );
};

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

  describe('SCHEDULED', () => {
    test('shows the badge and when it fires, as a hydrated run time', () => {
      const component = renderCell({
        scheduledFor: FIRES_AT,
        status: 'SCHEDULED',
      });

      expect(
        component.getByText(PLAN_RUN_STATUS_CELL_COPY.scheduledBadge),
      ).toBeInTheDocument();
      expect(component.container.textContent).toContain(
        PLAN_RUN_STATUS_CELL_COPY.firesPrefix,
      );
      const time = component.getByTestId('PlanRunTime');
      expect(time).toHaveAttribute('dateTime', FIRES_AT);
      expect(time).not.toHaveTextContent(/UTC$/);
    });

    test('server-renders the fire time in UTC so hydration matches in any server zone', () => {
      const html = renderToString(
        <TooltipProvider>
          <PlanRunStatusCell
            resumeOfRunId={null}
            resumeScheduled={false}
            scheduledFor={FIRES_AT}
            status="SCHEDULED"
            usageLimitResetsAt={null}
          />
        </TooltipProvider>,
      );

      expect(html).toContain(`dateTime="${FIRES_AT}"`);
      expect(html).toContain('Nov 3, 2026, 5:30 PM UTC');
    });

    test('falls back to an unknown line when scheduledFor is missing or unparseable', () => {
      const missing = renderCell({ status: 'SCHEDULED' });
      expect(
        missing.getByText(PLAN_RUN_STATUS_CELL_COPY.firesUnknown),
      ).toBeInTheDocument();
      missing.unmount();

      const garbage = renderCell({
        scheduledFor: 'not-a-date',
        status: 'SCHEDULED',
      });
      expect(
        garbage.getByText(PLAN_RUN_STATUS_CELL_COPY.firesUnknown),
      ).toBeInTheDocument();
      expect(garbage.container.querySelector('time')).toBeNull();
    });
  });

  describe('MISSED', () => {
    test('shows the badge and why it never fired', () => {
      const component = renderCell({ status: 'MISSED' });

      expect(
        component.getByText(PLAN_RUN_STATUS_CELL_COPY.missedBadge),
      ).toBeInTheDocument();
      expect(
        component.getByText(PLAN_RUN_STATUS_CELL_COPY.missedReason),
      ).toBeInTheDocument();
    });
  });

  describe('SUPERSEDED', () => {
    test('shows the badge and why it was skipped', () => {
      const component = renderCell({ status: 'SUPERSEDED' });

      expect(
        component.getByText(PLAN_RUN_STATUS_CELL_COPY.supersededBadge),
      ).toBeInTheDocument();
      expect(
        component.getByText(PLAN_RUN_STATUS_CELL_COPY.supersededReason),
      ).toBeInTheDocument();
    });
  });

  describe('SKIPPED', () => {
    test('shows the neutral badge and the settled reason', () => {
      const component = renderCell({
        settledReason: SETTLED_REASON,
        status: 'SKIPPED',
      });

      expect(
        component.getByText(PLAN_RUN_STATUS_CELL_COPY.skippedBadge),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('PlanRunStatusCell-reason'),
      ).toHaveTextContent(SETTLED_REASON);
    });

    test('renders no reason line when the reason is null', () => {
      const component = renderCell({ settledReason: null, status: 'SKIPPED' });

      expect(
        component.getByText(PLAN_RUN_STATUS_CELL_COPY.skippedBadge),
      ).toBeInTheDocument();
      expect(component.queryByTestId('PlanRunStatusCell-reason')).toBeNull();
    });
  });

  describe('settledReason on MISSED and SUPERSEDED', () => {
    test.each(['MISSED', 'SUPERSEDED'])(
      'prefers the settled reason over the generic line for %s',
      (status) => {
        const component = renderCell({
          settledReason: SETTLED_REASON,
          status,
        });

        expect(
          component.getByTestId('PlanRunStatusCell-reason'),
        ).toHaveTextContent(SETTLED_REASON);
        expect(
          component.queryByText(PLAN_RUN_STATUS_CELL_COPY.missedReason),
        ).toBeNull();
        expect(
          component.queryByText(PLAN_RUN_STATUS_CELL_COPY.supersededReason),
        ).toBeNull();
      },
    );
  });
});
