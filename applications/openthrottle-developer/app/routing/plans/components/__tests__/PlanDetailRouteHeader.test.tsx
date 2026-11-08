import * as React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { PlanDetailsFragment } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

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

describe('PlanDetailRouteHeader Component', () => {
  test('renders title, status, and assignee', () => {
    const { getByRole, getByText, queryByLabelText } = renderRoutesStub(
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
    const { getByRole } = renderRoutesStub(
      <PlanDetailRouteHeader plan={basePlan} status="IN_PROGRESS" />,
    );

    expect(getByRole('link', { name: 'In Progress' })).toHaveAttribute(
      'href',
      '/plans?status=IN_PROGRESS',
    );
  });

  // The project chip is currently commented out in the header. Until it comes
  // back, assert it stays absent even for a plan that does point at a project,
  // so re-enabling it fails here rather than silently changing the header.
  test('renders no project chip even when the plan points at a project', () => {
    const { queryByTestId } = renderRoutesStub(
      <PlanDetailRouteHeader plan={planWithProject} status="IN_PROGRESS" />,
    );

    expect(queryByTestId('PlanProjectBadge')).not.toBeInTheDocument();
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
      const { getByTestId } = renderRoutesStub(
        <PlanDetailRouteHeader plan={scheduledPlan} status="SCHEDULED" />,
      );

      expect(getByTestId('PlanUnscheduleAction')).toBeInTheDocument();
    });

    test('is absent with beta preview, where the toolbar owns status', () => {
      betaPreview.enabled = true;
      const { queryByTestId } = renderRoutesStub(
        <PlanDetailRouteHeader plan={scheduledPlan} status="SCHEDULED" />,
      );

      expect(queryByTestId('PlanUnscheduleAction')).toBeNull();
    });

    test('is absent on a plan that is not scheduled', () => {
      const { queryByTestId } = renderRoutesStub(
        <PlanDetailRouteHeader plan={basePlan} status="IN_PROGRESS" />,
      );

      expect(queryByTestId('PlanUnscheduleAction')).toBeNull();
    });
  });

  // Most plans have no project, so the chip must be absent rather than an
  // "unassigned" placeholder on every other plan header.
  test('renders no project chip when the plan points at nothing', () => {
    const { queryByTestId } = renderRoutesStub(
      <PlanDetailRouteHeader plan={basePlan} status="IN_PROGRESS" />,
    );

    expect(queryByTestId('PlanProjectBadge')).not.toBeInTheDocument();
  });
});
