import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { MemoryRouter, useLoaderData, useSearchParams } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/projects._index';
import type { ProjectWithStats } from '~/routing/projects/types';
import { buildRootMatch } from '~/testing/buildRootMatch';
import { renderWithMemoryRouter } from '~/testing/route-fixtures';

import Index, { shouldRevalidate } from '../projects._index';

const mockProjects: ProjectWithStats[] = [
  {
    __typename: 'ProjectObject',
    createdAt: '2025-01-01T00:00:00Z',
    description: 'First project',
    id: 'proj-1',
    name: 'First Project',
    nxProjectName: 'applications/openthrottle-developer',
    plans: [{ __typename: 'PlanObject', id: 'plan-a', status: 'COMPLETED' }],
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

  describe('pagination', () => {
    const pagedLoaderData = {
      ...mockLoaderDataWithProjects,
      limit: 10,
      page: 2,
      search: 'alpha',
      sortOrder: 'desc' as const,
      totalCount: 100,
      view: 'card' as const,
    };

    const renderPaged = (
      entry: string,
    ): ReturnType<typeof renderWithMemoryRouter> => {
      return renderWithMemoryRouter(
        [
          {
            Component: ProjectsRoute,
            HydrateFallback: () => null,
            loader: () => {
              return pagedLoaderData;
            },
            path: '/projects',
          },
        ],
        { initialEntries: [entry] },
      );
    };

    test('page links preserve search, sort, and view filters', async () => {
      const component = renderPaged(
        '/projects?page=2&limit=10&q=alpha&sortBy=name&sortOrder=desc&view=card',
      );

      expect(
        await component.findByTestId('OpenThrottlePagination'),
      ).toBeInTheDocument();
      const href = component
        .getByRole('link', { name: '3' })
        .getAttribute('href');
      const url = new URL(href ?? '', 'http://localhost');
      expect(url.pathname).toBe('/projects');
      expect(url.searchParams.get('page')).toBe('3');
      expect(url.searchParams.get('limit')).toBe('10');
      expect(url.searchParams.get('q')).toBe('alpha');
      expect(url.searchParams.get('sortBy')).toBe('name');
      expect(url.searchParams.get('sortOrder')).toBe('desc');
      expect(url.searchParams.get('view')).toBe('card');
      expect(
        component.getByRole('link', { name: 'Go to next page' }),
      ).toHaveAttribute('href', expect.stringContaining('page=3'));
    });

    test('page links keep the stats panel open', async () => {
      const component = renderPaged('/projects?page=2&limit=10&stats=open');

      const next = await component.findByRole('link', {
        name: 'Go to next page',
      });
      const url = new URL(next.getAttribute('href') ?? '', 'http://localhost');
      expect(url.searchParams.get('stats')).toBe('open');
      expect(url.searchParams.get('page')).toBe('3');
    });

    test('page links stay free of stats while the panel is closed', async () => {
      const component = renderPaged('/projects?page=2&limit=10');

      const next = await component.findByRole('link', {
        name: 'Go to next page',
      });
      const url = new URL(next.getAttribute('href') ?? '', 'http://localhost');
      expect(url.searchParams.has('stats')).toBe(false);
    });
  });

  describe('collapsible stats', () => {
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
