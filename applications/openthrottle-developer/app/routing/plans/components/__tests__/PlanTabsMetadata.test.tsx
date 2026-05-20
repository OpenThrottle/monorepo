import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { Tabs } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { PlanTabsMetadata } from '../PlanTabsMetadata';
import type { PlanTabsMetadataProps } from '../PlanTabsMetadata';
import type { PlanDetailsFragment } from '~/__generated__/graphql';

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

function renderMetadata(props: PlanTabsMetadataProps) {
  const Component = () => (
    <Tabs value="metadata">
      <PlanTabsMetadata {...props} />
    </Tabs>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('PlanTabsMetadata Component', () => {
  test('renders plan metadata fields and project link', () => {
    const { getByTestId, getByText, getByRole, getAllByText } = renderMetadata({
      plan: mockPlan,
    });

    expect(getByTestId('PlanTabsMetadata')).toBeInTheDocument();
    expect(getByText('Author')).toBeInTheDocument();
    expect(getAllByText('visormatt').length).toBe(2);
    expect(getByText('Category')).toBeInTheDocument();
    expect(getByText('feature')).toBeInTheDocument();
    const projectLink = getByRole('link', { name: 'Test Project' });
    expect(projectLink).toHaveAttribute(
      'href',
      '/projects/11111111-1111-4111-8111-111111111111',
    );
  });
});
