import { render, type RenderResult } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_STATUS_CELL_COPY } from '~/routing/plans/data/data.copy';

import {
  PlanRunStatusCell,
  type PlanRunStatusCellProps,
} from '../PlanRunStatusCell';

const RESETS_AT = '2026-11-01T17:00:00.000Z';
const FIRES_AT = '2026-11-03T17:30:00.000Z';

const renderCell = (
  overrides: Partial<PlanRunStatusCellProps> = {},
): RenderResult => {
  return render(
    <PlanRunStatusCell
      resumeOfRunId={null}
      resumeScheduled={false}
      status="COMPLETED"
      usageLimitResetsAt={null}
      {...overrides}
    />,
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
    beforeEach(() => {
      // Pin the viewer's zone so the local-time rendering is deterministic.
      vi.stubEnv('TZ', 'America/New_York');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    test('shows the badge and when it fires, in the viewer local time', () => {
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
      const time = component.container.querySelector('time');
      expect(time?.dateTime).toBe(FIRES_AT);
      // 17:30Z is 12:30 PM EST on Nov 3 2026 (DST ended Nov 1).
      expect(time?.textContent).toContain('12:30');
      expect(time?.textContent).toBe(new Date(FIRES_AT).toLocaleString());
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
});
