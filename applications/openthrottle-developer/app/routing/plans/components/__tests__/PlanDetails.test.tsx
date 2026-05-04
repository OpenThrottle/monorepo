import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PlanDetails } from '../PlanDetails';
import type { PlanDetailsProps } from '../PlanDetails';
import type {
  PlanDetailIndexLoaderQuery,
  PlanDetailsFragment,
} from '~/__generated__/graphql';
import {
  getDefaultWorkflowRalphRunOptionsInput,
  type WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

const mockPlan: PlanDetailsFragment = {
  __typename: 'PlanObject',
  assignee: 'visormatt',
  author: 'visormatt',
  category: 'feature',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Plan description',
  id: '0c2720a9-920f-4b16-865a-f803eb444e18',
  projectId: '11111111-1111-4111-8111-111111111111',
  projectRelation: {
    __typename: 'ProjectObject',
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Test Project',
  },
  status: 'IN_PROGRESS',
  summary: 'Plan summary',
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

const defaultWorkflow: WorkflowRalphRunOptionsInput =
  getDefaultWorkflowRalphRunOptionsInput({ planId: mockPlan.id });

const defaultRecent: PlanDetailIndexLoaderQuery['metrics']['recentPlanRunsMetrics'] =
  [];

describe('PlanDetails Component', () => {
  let component: RenderResult;
  let props: PlanDetailsProps;

  beforeEach(() => {
    props = {
      plan: mockPlan,
      ralphTuningJson: '',
      recentPlanRuns: defaultRecent,
      workflowInput: defaultWorkflow,
      workflowTimeout: '',
    };

    const Component = () => (
      <TooltipProvider>
        <PlanDetails {...props} />
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub initialEntries={['/']} />);
  });

  afterEach(() => {
    cleanup();
  });

  test('should render plan shell and title', () => {
    expect(component.getByTestId('PlanDetails')).toBeInTheDocument();
    expect(component.getByText('Test Plan')).toBeInTheDocument();
  });

  test('should render workflow run transparency', () => {
    expect(
      component.getByTestId('PlanWorkflowRunTransparency'),
    ).toBeInTheDocument();
    expect(component.getByRole('table')).toBeInTheDocument();
  });

  test('should show canonical workflow-ralph CLI preview with plan id', () => {
    const pre = component.getByTestId(
      'PlanWorkflowRunTransparency-canonical-cli',
    );
    expect(pre).toHaveTextContent('pnpm exec workflow-ralph');
    expect(pre).toHaveTextContent(mockPlan.id);
  });

  test('should show formatted metadata with labels', () => {
    expect(component.getByText('Author')).toBeInTheDocument();
    expect(component.getByText('Assignee')).toBeInTheDocument();
    expect(component.getByText('Category')).toBeInTheDocument();
    expect(component.getByText('Project')).toBeInTheDocument();
    expect(component.getByText('Created')).toBeInTheDocument();
    expect(component.getByText('Updated')).toBeInTheDocument();
  });

  test('should show description and summary', () => {
    expect(component.getByText('Plan description')).toBeInTheDocument();
    expect(component.getByText('Plan summary')).toBeInTheDocument();
  });

  test('passes ralphTuningJson through to the toolbar enqueue form', () => {
    cleanup();
    const payload = JSON.stringify({ model: 'fast' });
    const Component = () => (
      <TooltipProvider>
        <PlanDetails
          plan={mockPlan}
          ralphTuningJson={payload}
          recentPlanRuns={defaultRecent}
          workflowInput={defaultWorkflow}
          workflowTimeout=""
        />
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const r = render(<RoutesStub initialEntries={['/']} />);

    const el = r.container
      .querySelector('[data-testid="PlanToolbar"]')
      ?.querySelector('input[name="ralphTuning"]');
    expect(el).toBeInstanceOf(HTMLInputElement);
    if (!(el instanceof HTMLInputElement)) {
      throw new Error('expected ralphTuning hidden input');
    }
    expect(el.value).toBe(payload);
  });
});
