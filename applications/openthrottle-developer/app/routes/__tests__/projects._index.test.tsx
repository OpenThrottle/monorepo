import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Index from '../projects._index';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { ProjectWithStats } from '~/routing/projects/data/types';

const mockProjects: ProjectWithStats[] = [
  {
    __typename: 'ProjectObject',
    createdAt: '2025-01-01T00:00:00Z',
    description: 'First project',
    id: 'proj-1',
    name: 'First Project',
    nxProjectName: 'applications/openthrottle-developer',
    plans: [{ __typename: 'PlanObject', title: 'Plan A' }],
    tasks: [{ __typename: 'TaskObject', title: 'Task 1' }],
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

const mockLoaderDataWithProjects = {
  limit: 5,
  page: 1,
  plansLinkedCount: 0,
  projects: mockProjects,
  search: '',
  sortBy: 'name' as const,
  sortOrder: 'asc' as const,
  totalCount: 1,
  view: 'table' as const,
};

const mockLoaderDataEmpty = {
  limit: 5,
  page: 1,
  plansLinkedCount: 0,
  projects: [],
  search: '',
  sortBy: 'name' as const,
  sortOrder: 'asc' as const,
  totalCount: 0,
  view: 'table' as const,
};

describe('routes/projects._index.tsx', () => {
  test('should render with projects (table view)', () => {
    const component = render(
      <MemoryRouter>
        <Index
          actionData={undefined}
          loaderData={mockLoaderDataWithProjects}
          matches={[] as any}
          params={{}}
        />
      </MemoryRouter>,
    );
    expect(
      component.getByRole('heading', { name: 'Projects' }),
    ).toBeInTheDocument();
    expect(component.getByTestId('ProjectsTable')).toBeInTheDocument();
    expect(component.getByText('First Project')).toBeInTheDocument();
  });

  test('should render empty state when no projects', () => {
    const component = render(
      <MemoryRouter>
        <Index
          actionData={undefined}
          loaderData={mockLoaderDataEmpty}
          matches={[] as any}
          params={{}}
        />
      </MemoryRouter>,
    );
    expect(
      component.getByRole('heading', { name: 'Projects' }),
    ).toBeInTheDocument();
    expect(component.getByText('No projects yet')).toBeInTheDocument();
    const newProjectLinks = component.getAllByRole('link', {
      name: /new project/i,
    });
    expect(newProjectLinks.length).toBeGreaterThanOrEqual(1);
    expect(newProjectLinks[0]).toHaveAttribute('href', '/projects/create');
  });

  test('should render pagination links that preserve search, sort, and view filters', () => {
    const view = renderRoutesStub(
      <Index
        actionData={undefined}
        loaderData={{
          limit: 10,
          page: 2,
          plansLinkedCount: 0,
          projects: mockProjects,
          search: 'alpha',
          sortBy: 'name',
          sortOrder: 'desc',
          totalCount: 100,
          view: 'card',
        }}
        matches={[] as never}
        params={{}}
      />,
    );

    expect(view.getByTestId('OpenThrottlePagination')).toBeInTheDocument();
    const pageLink = view.getByRole('link', { name: '2' });
    const href = pageLink.getAttribute('href') ?? '';
    expect(href).toContain('/projects?');
    expect(href).toContain('page=2');
    expect(href).toContain('limit=10');
    expect(href).toContain('q=alpha');
    expect(href).toContain('sortBy=name');
    expect(href).toContain('sortOrder=desc');
    expect(href).toContain('view=card');
    expect(view.getByRole('link', { name: 'Go to next page' })).toHaveAttribute(
      'href',
      expect.stringContaining('page=3'),
    );
  });
});
