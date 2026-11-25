import * as React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { PlanDetailsFragment } from '~/__generated__/graphql';
import {
  buildPlanDetailLoaderData,
  renderWithPlanDetailRouteData,
} from '~/routing/plans/testing/plan-detail-route-data';

import { PlanDetailRouteHeader } from '../PlanDetailRouteHeader';

// FEATURE_BETA_PREVIEW resolves from process.env at module load; mock it as a
// getter over a hoisted box so both sides of the D10 gate are exercised.
const betaPreview = vi.hoisted(() => ({ enabled: false }));

vi.mock('@openthrottle/react-router-utils', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-utils')>();

  return {
    ...actual,
    get FEATURE_BETA_PREVIEW() {
      return betaPreview.enabled;
    },
  };
});

const basePlan: PlanDetailsFragment = {
  __typename: 'PlanObject',
  afterHooks: [],
  assignee: 'visormatt',
  author: 'author1',
  beforeHooks: [],
  category: 'frontend',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Plan description',
  id: 'plan-1',
  jobRunHooksJson: '{"hooks":[]}',
  project: null,
  projectId: null,
  projectRelation: null,
  runConfigJson: '{}',
  runnableTaskCount: 1,
  status: 'IN_PROGRESS',
  summary: null,
  tags: [
    {
      __typename: 'PlanTagObject',
      confidence: null,
      dimension: 'phase',
      id: 'tag-1',
      source: 'human',
      tag: 'discovery',
    },
  ],
  title: 'Ship the issue-tracker UX',
  updatedAt: '2025-01-03T00:00:00Z',
};

const planWithProject: PlanDetailsFragment = {
  ...basePlan,
  project: 'atlas-api',
  projectId: 'project-1',
  projectRelation: {
    __typename: 'ProjectObject',
    id: 'project-1',
    name: 'atlas-api',
  },
};

// The header's project picker reads the route's deferred `projects` key.
const renderHeader = (element: React.ReactElement) => {
  return renderWithPlanDetailRouteData(element, buildPlanDetailLoaderData());
};

describe('PlanDetailRouteHeader Component', () => {
  test('renders title, status, and assignee', () => {
    const { getByRole, getByText, queryByLabelText } = renderHeader(
      <PlanDetailRouteHeader plan={basePlan} status="IN_PROGRESS" />,
    );

    expect(
      getByRole('heading', { name: 'Ship the issue-tracker UX' }),
    ).toBeInTheDocument();
    expect(getByText('In Progress')).toBeInTheDocument();
    expect(getByText('author1 → visormatt')).toBeInTheDocument();
    // Tags moved off the detail header and now live on the plans list surface.
    expect(queryByLabelText('Tag: discovery')).toBeNull();
  });

  test('links the status badge to the filtered plans list', () => {
    const { getByRole } = renderHeader(
      <PlanDetailRouteHeader plan={basePlan} status="IN_PROGRESS" />,
    );

    expect(getByRole('link', { name: 'In Progress' })).toHaveAttribute(
      'href',
      '/plans?status=IN_PROGRESS',
    );
  });

  test('renders the project chip linking to the plan project', () => {
    const { queryByTestId } = renderHeader(
      <PlanDetailRouteHeader plan={planWithProject} status="IN_PROGRESS" />,
    );

    expect(queryByTestId('PlanProjectBadge')).toHaveAttribute(
      'href',
      '/projects/project-1',
    );
  });

  describe('the non-beta unschedule control (D10)', () => {
    const scheduledPlan: PlanDetailsFragment = {
      ...basePlan,
      scheduledRunAt: '2026-11-08T17:00:00.000Z',
      status: 'SCHEDULED',
    };

    afterEach(() => {
      betaPreview.enabled = false;
    });

    test('renders beside the badge on a SCHEDULED plan without beta preview', () => {
      const { getByTestId } = renderHeader(
        <PlanDetailRouteHeader plan={scheduledPlan} status="SCHEDULED" />,
      );

      expect(getByTestId('PlanUnscheduleAction')).toBeInTheDocument();
    });

    test('is absent with beta preview, where the toolbar owns status', () => {
      betaPreview.enabled = true;
      const { queryByTestId } = renderHeader(
        <PlanDetailRouteHeader plan={scheduledPlan} status="SCHEDULED" />,
      );

      expect(queryByTestId('PlanUnscheduleAction')).toBeNull();
    });

    test('is absent on a plan that is not scheduled', () => {
      const { queryByTestId } = renderHeader(
        <PlanDetailRouteHeader plan={basePlan} status="IN_PROGRESS" />,
      );

      expect(queryByTestId('PlanUnscheduleAction')).toBeNull();
    });
  });

  // Most plans have no project, so the chip must be absent rather than an
  // "unassigned" placeholder on every other plan header.
  test('renders no project chip when the plan points at nothing', () => {
    const { queryByTestId } = renderHeader(
      <PlanDetailRouteHeader plan={basePlan} status="IN_PROGRESS" />,
    );

    expect(queryByTestId('PlanProjectBadge')).not.toBeInTheDocument();
  });
});
