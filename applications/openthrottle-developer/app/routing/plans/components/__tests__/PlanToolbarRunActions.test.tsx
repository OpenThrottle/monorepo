import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useFetcher } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { action } from '~/routes/plans.$planId._index';
import {
  PLAN_RUN_CANCEL_SCHEDULED_COPY,
  PLAN_TOOLBAR_COPY,
} from '~/routing/plans/data/data.copy';

import type { PlanToolbarRunActionsProps } from '../PlanToolbarRunActions';
import { PlanToolbarRunActions } from '../PlanToolbarRunActions';

type BaseProps = Omit<
  PlanToolbarRunActionsProps,
  'fetcherEvaluateRules' | 'fetcherRunPlan'
>;

const renderRunActions = (
  baseProps: BaseProps,
  submissions: FormData[] = [],
): RenderResult => {
  const Component = () => {
    const fetcherRunPlan = useFetcher<typeof action>();
    const fetcherEvaluateRules = useFetcher<typeof action>();

    return (
      <TooltipProvider>
        <PlanToolbarRunActions
          {...baseProps}
          fetcherEvaluateRules={fetcherEvaluateRules}
          fetcherRunPlan={fetcherRunPlan}
        />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([
    { Component, action: async () => null, path: '/' },
    {
      Component: () => null,
      action: async ({ request }) => {
        submissions.push(await request.formData());

        return {
          cancelPlanRun: { outcome: 'RUN_CANCELLED', removedJobIds: [] },
        };
      },
      path: '/plans/:planId',
    },
  ]);
  return render(<RoutesStub />);
};

describe('PlanToolbarRunActions Component', () => {
  let component: RenderResult;
  let props: BaseProps;

  beforeEach(() => {
    props = {
      branch: 'main',
      isRunning: false,
      isTerminal: false,
      jobRunHooksJson: '',
      models: Promise.resolve([]),
      newestRunIsStale: false,
      newestUnsupervisedUnsettledRunId: null,
      planId: 'plan-1',
      planTitle: 'My Plan',
      ralphTuningJson: '',
      runConfigJson: '{}',
      workflowRunBlocked: false,
    };

    component = renderRunActions(props);
  });

  test('renders the Run and Evaluate rules buttons', () => {
    expect(
      component.getByRole('button', { name: /run plan/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /evaluate rules/i }),
    ).toBeInTheDocument();
  });

  test('renders Kill run when the plan is cancelable', () => {
    component.unmount();
    component = renderRunActions({
      ...props,
      newestRunIsStale: false,
      planStatus: 'IN_PROGRESS',
    });

    expect(
      component.getByRole('button', { name: /kill plan run/i }),
    ).toBeInTheDocument();
  });

  test('replaces Kill run with a Stale badge when the newest run is stale', () => {
    component.unmount();
    component = renderRunActions({
      ...props,
      newestRunIsStale: true,
      planStatus: 'IN_PROGRESS',
    });

    expect(
      component.queryByRole('button', { name: /kill plan run/i }),
    ).not.toBeInTheDocument();
    expect(component.getByText('Stale')).toBeInTheDocument();
  });

  test('renders Settle run alongside Kill run when the newest run is an unsettled interactive run', () => {
    component.unmount();
    component = renderRunActions({
      ...props,
      newestUnsupervisedUnsettledRunId: 'run-1',
      planStatus: 'IN_PROGRESS',
    });

    expect(
      component.getByRole('button', { name: /kill plan run/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /settle interactive run/i }),
    ).toBeInTheDocument();
  });

  test('withholds Settle run while run history is loading or the newest run heartbeats', () => {
    component.unmount();
    component = renderRunActions({
      ...props,
      newestUnsupervisedUnsettledRunId: undefined,
      planStatus: 'IN_PROGRESS',
    });

    expect(
      component.queryByRole('button', { name: /settle interactive run/i }),
    ).not.toBeInTheDocument();
  });

  test('disables the Run button when the branch is missing', () => {
    component.unmount();
    component = renderRunActions({ ...props, branch: undefined });

    expect(component.getByRole('button', { name: /run plan/i })).toBeDisabled();
  });

  test('renders no Run dialog until a caret item opens it', () => {
    expect(component.queryByTestId('PlanRunDialog')).not.toBeInTheDocument();
  });

  test.each([
    { label: PLAN_TOOLBAR_COPY.runWithOptionsLabel, tab: 'Run now' },
    { label: PLAN_TOOLBAR_COPY.scheduleLabel, tab: 'Schedule' },
  ])('the "$label" item opens the dialog on the $tab tab', async (item) => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', {
        name: PLAN_TOOLBAR_COPY.runCaretAriaLabel,
      }),
    );
    await user.click(
      await component.findByRole('menuitem', { name: item.label }),
    );

    expect(await component.findByTestId('PlanRunDialog')).toBeInTheDocument();
    expect(component.getByRole('tab', { name: item.tab })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  describe('Cancel scheduled run', () => {
    const openCaret = async (
      user: ReturnType<typeof userEvent.setup>,
    ): Promise<void> => {
      await user.click(
        component.getByRole('button', {
          name: PLAN_TOOLBAR_COPY.runCaretAriaLabel,
        }),
      );
    };

    test('is absent from the caret menu when no run is scheduled', async () => {
      const user = userEvent.setup();

      await openCaret(user);
      await component.findByRole('menuitem', {
        name: PLAN_TOOLBAR_COPY.scheduleLabel,
      });

      expect(
        component.queryByRole('menuitem', {
          name: PLAN_RUN_CANCEL_SCHEDULED_COPY.menuItemLabel,
        }),
      ).toBeNull();
    });

    test('confirms, then submits intent=cancelPlanRun with the scheduledRunId', async () => {
      const user = userEvent.setup();
      const submissions: FormData[] = [];
      component.unmount();
      component = renderRunActions(
        {
          ...props,
          scheduledRunAt: '2026-11-03T21:00:00.000Z',
          scheduledRunId: 'run-9',
        },
        submissions,
      );

      await openCaret(user);
      await user.click(
        await component.findByRole('menuitem', {
          name: PLAN_RUN_CANCEL_SCHEDULED_COPY.menuItemLabel,
        }),
      );

      expect(
        await component.findByRole('heading', {
          name: PLAN_RUN_CANCEL_SCHEDULED_COPY.dialogTitle,
        }),
      ).toBeInTheDocument();
      expect(submissions).toHaveLength(0);

      await user.click(
        component.getByRole('button', {
          name: PLAN_RUN_CANCEL_SCHEDULED_COPY.confirmLabel,
        }),
      );

      await waitFor(() => expect(submissions).toHaveLength(1));
      expect(submissions[0]?.get('intent')).toBe('cancelPlanRun');
      expect(submissions[0]?.get('planRunId')).toBe('run-9');
    });
  });
});
