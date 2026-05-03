import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlansToolbar } from '../PlansToolbar';
import type { PlansToolbarProps } from '../PlansToolbar';

describe('PlansToolbar Component', () => {
  let component: RenderResult;
  let props: PlansToolbarProps;

  beforeEach(() => {
    props = {
      assigneeOptions: ['visormatt', 'other'],
      assignees: [],
      limit: 10,
      page: 1,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      statuses: ['IN_PROGRESS', 'PENDING', 'BACKLOG'],
      view: 'table',
    } satisfies PlansToolbarProps;

    const Component = () => <PlansToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders toolbar shell', () => {
    expect(component.getByTestId('PlansToolbar')).toBeInTheDocument();
  });

  test('renders status filter (StatusMultiSelect) with selected count in trigger', () => {
    const statusFilter = component.getByTestId('PlansToolbar-status-filter');
    expect(statusFilter).toBeInTheDocument();
    expect(
      component.getByRole('combobox', { name: /status/i }),
    ).toBeInTheDocument();
    expect(component.getByText('Status (3)')).toBeInTheDocument();
  });

  test('renders plans search input', () => {
    expect(
      component.getByRole('searchbox', { name: /search plans/i }),
    ).toBeInTheDocument();
  });
});
