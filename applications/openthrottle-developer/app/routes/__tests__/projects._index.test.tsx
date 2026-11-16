import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { MemoryRouter, useLoaderData, useSearchParams } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/projects._index';
import type { ProjectWithStats } from '~/routing/projects/types';
import { buildRootMatch } from '~/testing/buildRootMatch';
import {
  renderRoutesStub,
  renderWithMemoryRouter,
} from '~/testing/route-fixtures';

import Index, { shouldRevalidate } from '../projects._index';

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
  tasksLinkedCount: 0,
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
  tasksLinkedCount: 0,
  totalCount: 0,
  view: 'table' as const,
};

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/projects._index',
    loaderData: mockLoaderDataWithProjects,
    params: {},
    pathname: '/',
  },
];

describe('routes/projects._index.tsx', () => {
  test('should render with projects (table view)', () => {
    const component = render(
      <MemoryRouter>
        <Index
          actionData={undefined}
          loaderData={mockLoaderDataWithProjects}
          matches={matches}
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
          matches={matches}
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
          tasksLinkedCount: 0,
          totalCount: 100,
          view: 'card',
        }}
        matches={matches}
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

  describe('collapsible stats', () => {
    const ProjectsRoute = (): React.ReactElement => {
      const loaderData = useLoaderData<typeof mockLoaderDataWithProjects>();
      const [searchParams] = useSearchParams();

      return (
        <>
          <Index
            actionData={undefined}
            loaderData={loaderData}
            matches={matches}
            params={{}}
          />
          <span data-testid="qs">{searchParams.toString()}</span>
        </>
      );
    };

    const renderProjects = (
      entry: string,
    ): {
      readonly component: ReturnType<typeof renderWithMemoryRouter>;
      readonly loader: ReturnType<typeof vi.fn>;
    } => {
      const loader = vi.fn(() => {
        return mockLoaderDataWithProjects;
      });
      const component = renderWithMemoryRouter(
        [
          {
            Component: ProjectsRoute,
            HydrateFallback: () => null,
            loader,
            path: '/projects',
            shouldRevalidate,
          },
        ],
        { initialEntries: [entry] },
      );

      return { component, loader };
    };

    test('stats are closed by default', async () => {
      const { component } = renderProjects('/projects');

      const toggle = await component.findByTestId('GlobalStatsToggleButton');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(component.queryByTestId('ProjectsStats')).toBeNull();
    });

    test('?stats=open deep-links the stats open', async () => {
      const { component } = renderProjects('/projects?stats=open');

      expect(await component.findByTestId('ProjectsStats')).toBeInTheDocument();
    });

    test('the toolbar toggle opens the stats without re-running the loader', async () => {
      const user = userEvent.setup();
      const { component, loader } = renderProjects('/projects?search=alpha');

      await user.click(await component.findByTestId('GlobalStatsToggleButton'));

      expect(await component.findByTestId('ProjectsStats')).toBeInTheDocument();
      const qs = new URLSearchParams(
        component.getByTestId('qs').textContent ?? '',
      );
      expect(qs.get('stats')).toBe('open');
      expect(qs.get('search')).toBe('alpha');
      await waitFor(() => {
        expect(loader).toHaveBeenCalledTimes(1);
      });
    });
  });
});
