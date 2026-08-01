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
  test('renders title, status, assignee, and tags', () => {
    const { getByRole, getByText, getByLabelText } = renderRoutesStub(
      <PlanDetailRouteHeader plan={basePlan} status="IN_PROGRESS" />,
    );

    expect(
      getByRole('heading', { name: 'Ship the issue-tracker UX' }),
    ).toBeInTheDocument();
    expect(getByText('In Progress')).toBeInTheDocument();
    expect(getByText('author1 → visormatt')).toBeInTheDocument();
    expect(getByLabelText('Tag: discovery')).toBeInTheDocument();
  });

  test('breadcrumb links to the plans list when no project is linked', () => {
    const { getByRole } = renderRoutesStub(
      <PlanDetailRouteHeader plan={basePlan} status="IN_PROGRESS" />,
    );

    expect(getByRole('link', { name: 'Plans' })).toHaveAttribute(
      'href',
      '/plans',
    );
  });

  test('breadcrumb links to the project when the plan is project-linked', () => {
    const linkedPlan: PlanDetailsFragment = {
      ...basePlan,
      projectRelation: {
        __typename: 'ProjectObject',
        id: 'proj-1',
        name: 'Project One',
      },
    };
    const { getByRole } = renderRoutesStub(
      <PlanDetailRouteHeader plan={linkedPlan} status="IN_PROGRESS" />,
    );

    expect(getByRole('link', { name: 'Plans' })).toHaveAttribute(
      'href',
      '/plans',
    );
    expect(getByRole('link', { name: 'Project One' })).toHaveAttribute(
      'href',
      '/projects/proj-1',
    );
  });
});
