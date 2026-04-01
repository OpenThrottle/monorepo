import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanCard } from '../PlanCard';
import type { PlanCardProps } from '../PlanCard';

describe('PlanCard Component', () => {
  let component: RenderResult;
  let props: PlanCardProps;

  beforeEach(() => {
    props = {
      plan: {
        author: 'test-author',
        category: 'test-category',
        createdAt: new Date('2025-01-01'),
        description: 'Test Description',
        id: '123',
        status: 'IN_PROGRESS',
        taskCount: 0,
        title: 'Test Plan',
        updatedAt: new Date('2025-01-01'),
      },
    };

    const Component = () => <PlanCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render plan title, status badge, and link to plan detail', () => {
    expect(component.getByTestId('PlanCard')).toBeInTheDocument();
    expect(component.getByText('Test Plan')).toBeInTheDocument();
    expect(component.getByText('In progress')).toBeInTheDocument();
    const viewLink = component.getByRole('link', { name: /view plan/i });
    expect(viewLink).toHaveAttribute('href', '/plans/123');
  });
});
