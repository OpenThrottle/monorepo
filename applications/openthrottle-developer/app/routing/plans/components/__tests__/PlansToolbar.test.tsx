import { FACETED_FILTER_COPY } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render, within } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { PLAN_STATUS_FILTER_COPY } from '~/routing/plans/data/data.copy';

import type { PlansToolbarProps } from '../PlansToolbar';
import { PlansToolbar } from '../PlansToolbar';

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

    const Component = () => {
      return <PlansToolbar {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders toolbar shell', () => {
    expect(component.getByTestId('PlansToolbar')).toBeInTheDocument();
  });

  test('renders the status filter, collapsing 3 selections to a count', () => {
    const statusFilter = component.getByTestId('PlansToolbar-status-filter');
    const trigger = within(statusFilter).getByRole('combobox', {
      name: PLAN_STATUS_FILTER_COPY.title,
    });
    expect(trigger).toHaveTextContent(FACETED_FILTER_COPY.selectedCount(3));
  });

  test('renders plans search input', () => {
    expect(
      component.getByRole('searchbox', { name: /search plans/i }),
    ).toBeInTheDocument();
  });
});
