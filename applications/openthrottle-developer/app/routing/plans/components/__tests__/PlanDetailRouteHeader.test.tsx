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
});
