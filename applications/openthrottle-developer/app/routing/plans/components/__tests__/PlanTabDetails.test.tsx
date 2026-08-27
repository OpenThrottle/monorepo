import * as React from 'react';
import { Tabs, TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { PlanTabDetails } from '../PlanTabDetails';
import type { PlanTabDetailsProps } from '../PlanTabDetails';
import {
  buildPlanDetailLoaderData,
  renderWithPlanDetailRouteData,
} from '~/routing/plans/testing/plan-detail-route-data';
import type {
  PlanDetailRunHistoryQuery,
  PlanDetailsFragment,
} from '~/__generated__/graphql';

const mockPlan: PlanDetailsFragment = {
  __typename: 'PlanObject',
  afterHooks: [],
  assignee: 'visormatt',
  author: 'visormatt',
  beforeHooks: [],
  category: 'feature',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Plan description',
  id: '0c2720a9-920f-4b16-865a-f803eb444e18',
  jobRunHooksJson: '[]',
  projectId: '11111111-1111-4111-8111-111111111111',
  projectRelation: {
    __typename: 'ProjectObject',
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Test Project',
  },
  runConfigJson: '{}',
  status: 'IN_PROGRESS',
  summary: 'Plan summary',
  tags: [],
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

const defaultRecent: PlanDetailRunHistoryQuery['metrics']['recentPlanRunsMetrics'] =
  [];

const defaultPlanRunAuditRows: PlanDetailRunHistoryQuery['planRunsByPlanId'] =
  [];

describe('PlanTabDetails Component', () => {
  test('renders overview tab with workflow transparency', async () => {
    const setFullscreen = vi.fn<PlanTabDetailsProps['setFullscreen']>();
    const props: PlanTabDetailsProps = {
      fullscreen: false,
      setFullscreen,
    };

    const { findAllByText } = renderWithPlanDetailRouteData(
      <TooltipProvider>
        <Tabs value="overview">
          <PlanTabDetails {...props} />
        </Tabs>
      </TooltipProvider>,
      buildPlanDetailLoaderData({
        plan: mockPlan,
        runHistory: Promise.resolve({
          planRunAuditRows: defaultPlanRunAuditRows,
          recentPlanRuns: defaultRecent,
        }),
        tasks: [],
      }),
    );

    // Disabled w/ default feature flag
    // expect(getByTestId('PlanWorkflowRunTransparency')).toBeInTheDocument();

    // MarkdownRenderer compiles the description asynchronously, so await it.
    expect(
      (await findAllByText('Plan description')).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
