import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanDetails } from '../PlanDetails';
import type { PlanDetailsProps } from '../PlanDetails';
import type { PlanDetailsFragment } from '~/__generated__/graphql';

const mockPlan: PlanDetailsFragment = {
  __typename: 'PlanObject',
  assignee: 'visormatt',
  author: 'visormatt',
  category: 'feature',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Plan description',
  id: 'plan-1',
  projectId: 'proj-1',
  projectRelation: {
    __typename: 'ProjectObject',
    id: 'proj-1',
    name: 'Test Project',
  },
  status: 'IN_PROGRESS',
  summary: 'Plan summary',
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

describe('PlanDetails Component', () => {
  let component: RenderResult;
  let props: PlanDetailsProps;

  beforeEach(() => {
    props = { plan: mockPlan };

    const Component = () => <PlanDetails {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render plan shell and title', () => {
    expect(component.getByTestId('PlanDetails')).toBeInTheDocument();
    expect(component.getByText('Test Plan')).toBeInTheDocument();
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
});
