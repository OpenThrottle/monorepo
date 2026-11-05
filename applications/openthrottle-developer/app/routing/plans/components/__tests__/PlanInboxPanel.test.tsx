import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type {
  PlanInboxMessageFragment,
  PlanTaskRowFragment,
} from '~/__generated__/graphql';
import { PLAN_INBOX_COPY } from '~/routing/plans/data/data.copy';

import type { PlanInboxPanelProps } from '../PlanInboxPanel';
import { PlanInboxPanel } from '../PlanInboxPanel';

const message = (
  overrides: Partial<PlanInboxMessageFragment> & { readonly id: string },
): PlanInboxMessageFragment => {
  return {
    author: 'visormatt',
    body: `body-${overrides.id}`,
    createdAt: '2026-11-03T00:00:00Z',
    deliveredAt: null,
    deliveredToTaskId: null,
    kind: 'STEER',
    planId: 'p1',
    status: 'PENDING',
    taskId: null,
    updatedAt: '2026-11-03T00:00:00Z',
    ...overrides,
  };
};

const task: PlanTaskRowFragment = {
  assignee: null,
  category: null,
  createdAt: '2026-11-03T00:00:00Z',
  description: null,
  hookRole: null,
  id: 't1',
  planId: 'p1',
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'IN_PROGRESS',
  summary: null,
  title: 'Wire the composer',
  updatedAt: '2026-11-03T00:00:00Z',
  wave: null,
};

const renderPanel = (
  props: Omit<PlanInboxPanelProps, 'planId' | 'tasks'>,
  action: (posted: Record<string, FormDataEntryValue>) => unknown = () => null,
) => {
  const Component = () => {
    return <PlanInboxPanel {...props} planId="p1" tasks={[task]} />;
  };
  const RoutesStub = createRoutesStub([
    {
      Component,
      action: async ({ request }) =>
        action(Object.fromEntries(await request.formData())),
      path: '/plans/:planId',
    },
  ]);

  return render(<RoutesStub initialEntries={['/plans/p1']} />);
};

describe('PlanInboxPanel', () => {
  describe('when no run is live and nothing was sent', () => {
    test('renders nothing', () => {
      const component = renderPanel({ isLive: false, messages: [] });

      expect(component.queryByTestId('PlanInboxPanel')).not.toBeInTheDocument();
    });
  });

  describe('when a run is live', () => {
    test('offers the composer and an empty-inbox hint', () => {
      const component = renderPanel({ isLive: true, messages: [] });

      expect(
        component.getByRole('heading', { name: PLAN_INBOX_COPY.heading }),
      ).toBeInTheDocument();
      expect(
        component.getByLabelText(PLAN_INBOX_COPY.bodyLabel),
      ).toBeInTheDocument();
      expect(
        component.getByText(PLAN_INBOX_COPY.emptyLive),
      ).toBeInTheDocument();
    });

    test('lists messages with their delivery status and target task', () => {
      const component = renderPanel({
        isLive: true,
        messages: [
          message({
            deliveredAt: '2026-11-03T00:01:00Z',
            deliveredToTaskId: 't1',
            id: 'delivered',
            status: 'DELIVERED',
          }),
          message({ id: 'waiting', kind: 'QUEUE' }),
        ],
      });

      const rows = component.getAllByTestId('plan-inbox-message');
      expect(rows.map((row) => row.dataset.status)).toEqual([
        'DELIVERED',
        'PENDING',
      ]);
      expect(
        component.getByText(PLAN_INBOX_COPY.deliveredToTask(task.title)),
      ).toBeInTheDocument();
    });

    test('only a waiting message can be withdrawn, and withdraw posts its id', async () => {
      const user = userEvent.setup();
      const posts: Array<Record<string, FormDataEntryValue>> = [];
      const component = renderPanel(
        {
          isLive: true,
          messages: [
            message({ id: 'delivered', status: 'DELIVERED' }),
            message({ id: 'waiting' }),
          ],
        },
        (posted) => {
          posts.push(posted);
          return { withdrawPlanMessage: { id: 'waiting' } };
        },
      );

      // getByRole throws on more than one match: only the waiting row has one.
      await user.click(
        component.getByRole('button', {
          name: PLAN_INBOX_COPY.withdrawAriaLabel,
        }),
      );

      await waitFor(() => {
        expect(posts).toEqual([
          { id: 'waiting', intent: 'withdrawPlanMessage' },
        ]);
      });
    });
  });

  describe('when the run has ended but messages were sent', () => {
    test('keeps the history and hides the composer', () => {
      const component = renderPanel({
        isLive: false,
        messages: [message({ id: 'delivered', status: 'DELIVERED' })],
      });

      expect(
        component.getByText(PLAN_INBOX_COPY.notLiveHint),
      ).toBeInTheDocument();
      expect(
        component.queryByLabelText(PLAN_INBOX_COPY.bodyLabel),
      ).not.toBeInTheDocument();
      expect(
        component.getByText(PLAN_INBOX_COPY.deliveredUnknownTask),
      ).toBeInTheDocument();
    });
  });
});
