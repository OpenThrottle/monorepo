import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { Tabs, TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { PlanTabDetails } from '../PlanTabDetails';
import type { PlanTabDetailsProps } from '../PlanTabDetails';
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

const defaultPlanRunAuditRows: PlanDetailIndexLoaderQuery['planRunsByPlanId'] =
  [];

describe('PlanTabDetails Component', () => {
  test('renders overview tab with plan toolbar and workflow transparency', async () => {
    const setFullscreen = vi.fn() as PlanTabDetailsProps['setFullscreen'];
    const props: PlanTabDetailsProps = {
      fullscreen: false,
      plan: mockPlan,
      planRunAuditRows: defaultPlanRunAuditRows,
      ralphTuningJson: '',
      recentPlanRuns: defaultRecent,
      setFullscreen,
      workflowInput: defaultWorkflow,
      workflowTimeout: '',
    };

    const Component = () => (
      <TooltipProvider>
        <Tabs value="overview">
          <PlanTabDetails {...props} />
        </Tabs>
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { findAllByText, getByTestId, getByText } = render(<RoutesStub />);

    expect(getByTestId('PlanToolbar')).toBeInTheDocument();
    expect(getByTestId('PlanWorkflowRunTransparency')).toBeInTheDocument();
    // MarkdownRenderer compiles the description asynchronously, so await it.
    expect(
      (await findAllByText('Plan description')).length,
    ).toBeGreaterThanOrEqual(1);
    expect(getByText('Full Screen')).toBeInTheDocument();
  });
});
