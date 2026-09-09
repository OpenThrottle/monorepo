import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { useFetcher, createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import type { action } from '~/routes/plans.$planId._index';
import { PlanToolbarRunActions } from '../PlanToolbarRunActions';
import type { PlanToolbarRunActionsProps } from '../PlanToolbarRunActions';

type BaseProps = Omit<
  PlanToolbarRunActionsProps,
  'fetcherEvaluateRules' | 'fetcherRunPlan'
>;

const renderRunActions = (baseProps: BaseProps): RenderResult => {
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
      newestRunIsStale: false,
      newestUnsupervisedUnsettledRunId: null,
      planId: 'plan-1',
      planTitle: 'My Plan',
      ralphTuningJson: '',
      workflowRunBlocked: false,
    };

    component = renderRunActions(props);
  });

  test('renders the Run and Evaluate rules buttons', () => {
    expect(component.getByRole('button', { name: /run/i })).toBeInTheDocument();
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

    expect(component.getByRole('button', { name: /run/i })).toBeDisabled();
  });
});
