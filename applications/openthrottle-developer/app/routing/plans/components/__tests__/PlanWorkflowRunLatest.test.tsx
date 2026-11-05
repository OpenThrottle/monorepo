import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render, within } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';

import type { PlanWorkflowRunLatestProps } from '../PlanWorkflowRunLatest';
import { PlanWorkflowRunLatest } from '../PlanWorkflowRunLatest';

type Row = PlanWorkflowRunLatestProps['planRunAuditRows'][number];

const row = (overrides: Partial<Row> & Pick<Row, 'id' | 'status'>): Row => {
  return {
    __typename: 'PlanRunObject',
    createdAt: '2026-11-01T00:00:00.000Z',
    executionBackend: 'claude',
    heartbeatExpected: true,
    isStale: false,
    model: 'claude-opus',
    runKind: 'spawn',
    ...overrides,
  };
};

const renderLatest = (planRunAuditRows: Row[]) => {
  return render(
    <TooltipProvider>
      <PlanWorkflowRunLatest planRunAuditRows={planRunAuditRows} />
    </TooltipProvider>,
  );
};

describe('PlanWorkflowRunLatest', () => {
  describe('when an active run exists alongside a newer finished one', () => {
    test('shows the active run with its heartbeat', () => {
      const component = renderLatest([
        row({
          createdAt: '2026-11-03T00:00:00.000Z',
          id: 'done',
          status: 'COMPLETED',
        }),
        row({
          createdAt: '2026-11-02T00:00:00.000Z',
          id: 'active',
          lastHeartbeatAt: '2026-11-02T00:05:00.000Z',
          status: 'IN_PROGRESS',
        }),
      ]);

      const section = component.getByRole('region', {
        name: PLAN_RUN_TRANSPARENCY_COPY.latest.heading,
      });
      const card = within(section).getByTestId('PlanWorkflowRunLatest');
      expect(card).toHaveAttribute('data-status', 'IN_PROGRESS');
      expect(
        within(card).getByTestId('PlanWorkflowRunLatest-heartbeat'),
      ).toBeInTheDocument();
      expect(within(card).getByTestId('PlanRunMetaList')).toBeInTheDocument();
      expect(
        within(card).queryByTestId('PlanWorkflowRunLatest-stale'),
      ).toBeNull();
    });
  });

  describe('when the run is stale', () => {
    test('shows the stale warning instead of a heartbeat', () => {
      const component = renderLatest([
        row({
          id: 'stale',
          isStale: true,
          lastHeartbeatAt: '2026-11-01T00:05:00.000Z',
          status: 'IN_PROGRESS',
        }),
      ]);

      expect(
        component.getByTestId('PlanWorkflowRunLatest-stale'),
      ).toHaveTextContent(PLAN_RUN_TRANSPARENCY_COPY.latest.staleWarning);
      expect(
        component.queryByTestId('PlanWorkflowRunLatest-heartbeat'),
      ).toBeNull();
    });
  });

  describe('when the run is usage limited', () => {
    test('shows the status cell with its usage-limit badge', () => {
      const component = renderLatest([
        row({
          id: 'limited',
          status: 'USAGE_LIMITED',
          usageLimitResetsAt: '2026-11-01T05:00:00.000Z',
        }),
      ]);

      const card = component.getByTestId('PlanWorkflowRunLatest');
      expect(card).toHaveAttribute('data-status', 'USAGE_LIMITED');
      expect(
        within(card).getByTestId('PlanRunStatusBadge'),
      ).toBeInTheDocument();
      expect(
        within(card).queryByTestId('PlanWorkflowRunLatest-heartbeat'),
      ).toBeNull();
    });
  });

  describe('when every run is scheduled', () => {
    test('renders nothing', () => {
      const component = renderLatest([
        row({
          id: 'sched',
          scheduledFor: '2026-11-04T00:00:00.000Z',
          status: 'SCHEDULED',
        }),
      ]);

      expect(component.queryByTestId('PlanWorkflowRunLatest')).toBeNull();
      expect(
        component.queryByRole('region', {
          name: PLAN_RUN_TRANSPARENCY_COPY.latest.heading,
        }),
      ).toBeNull();
    });
  });
});
