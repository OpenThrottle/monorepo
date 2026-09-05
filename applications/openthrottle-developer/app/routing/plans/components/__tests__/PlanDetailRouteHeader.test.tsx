import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { PlanDetailRouteHeader } from '../PlanDetailRouteHeader';
import type { PlanDetailsFragment } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

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

  // Most plans have no project, so the chip must be absent rather than an
  // "unassigned" placeholder on every other plan header.
  test('renders no project chip when the plan points at nothing', () => {
    const { queryByTestId } = renderRoutesStub(
      <PlanDetailRouteHeader plan={basePlan} status="IN_PROGRESS" />,
    );

    expect(queryByTestId('PlanProjectBadge')).not.toBeInTheDocument();
  });
});
