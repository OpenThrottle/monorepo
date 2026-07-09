import * as React from 'react';
import { render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import ProjectDetail from '../projects.$projectId';
import type { Route } from '@/app/routes/+types/projects.$projectId';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { PROJECT_NOT_FOUND_COPY } from '~/routing/projects/data/data.copy';

const mockProject = {
  __typename: 'ProjectObject' as const,
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Test project description',
  id: 'proj-detail-1',
  name: 'Test Project',
  nxProjectName: null,
  updatedAt: '2025-01-02T00:00:00Z',
};

const mockProjectTask = {
  __typename: 'TaskObject' as const,
  assignee: 'dev@example.com',
  category: 'feature',
  createdAt: '2025-01-02T00:00:00Z',
  description: null,
  id: 'task-1',
  planId: 'plan-1',
  requirementsJson: '[]',
  summary: null,
  title: 'A project task',
  updatedAt: '2025-01-03T00:00:00Z',
};

const emptyProjectTasks: (typeof mockProjectTask)[] = [];

const defaultLoaderData = {
  limit: 20,
  page: 1,
  project: mockProject,
  projectTasks: emptyProjectTasks,
  totalTaskCount: 0,
};

const defaultMatches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/projects.$projectId',
    loaderData: defaultLoaderData,
    params: { projectId: mockProject.id },
    pathname: '/',
  },
];

describe('routes/projects.$projectId.tsx', () => {
  test('should render project detail when project exists', () => {
    const component = render(
      <MemoryRouter>
        <ProjectDetail
          actionData={undefined}
          loaderData={{
            ...defaultLoaderData,
            project: mockProject,
            projectTasks: [],
          }}
          matches={defaultMatches}
          params={{ projectId: mockProject.id }}
        />
      </MemoryRouter>,
    );
    expect(
      component.getByRole('tablist', { name: 'Project sections' }),
    ).toBeInTheDocument();
    expect(
      component.getAllByText('Test Project').length,
    ).toBeGreaterThanOrEqual(1);
    expect(component.getByText('Test project description')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'proj-detail-1' }),
    ).toBeInTheDocument();
  });

  test('should render Overview and Tasks tabs', () => {
    const component = render(
      <MemoryRouter>
        <ProjectDetail
          actionData={undefined}
          loaderData={{
            ...defaultLoaderData,
            project: mockProject,
            projectTasks: [],
          }}
          matches={defaultMatches}
          params={{ projectId: mockProject.id }}
        />
      </MemoryRouter>,
    );
    expect(
      component.getByRole('tablist', { name: 'Project sections' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: 'Overview' }),
    ).toBeInTheDocument();
    expect(component.getByRole('tab', { name: 'Tasks' })).toBeInTheDocument();
  });

  test('should show tasks tab content with empty state when no tasks', async () => {
    const user = userEvent.setup();
    const component = render(
      <MemoryRouter>
        <ProjectDetail
          actionData={undefined}
          loaderData={{
            ...defaultLoaderData,
            project: mockProject,
            projectTasks: [],
          }}
          matches={defaultMatches}
          params={{ projectId: mockProject.id }}
        />
      </MemoryRouter>,
    );
    await user.click(component.getByRole('tab', { name: 'Tasks' }));
    expect(component.getByText('No tasks')).toBeInTheDocument();
    expect(
      component.getByText('This project has no tasks yet.'),
    ).toBeInTheDocument();
  });

  test('should show ProjectTasksTable when projectTasks are provided', async () => {
    const user = userEvent.setup();
    const component = render(
      <MemoryRouter>
        <ProjectDetail
          actionData={undefined}
          loaderData={{
            ...defaultLoaderData,
            project: mockProject,
            projectTasks: [mockProjectTask],
            totalTaskCount: 1,
          }}
          matches={defaultMatches}
          params={{ projectId: mockProject.id }}
        />
      </MemoryRouter>,
    );
    await user.click(component.getByRole('tab', { name: 'Tasks' }));
    expect(component.getByText('A project task')).toBeInTheDocument();
    expect(component.getByTestId('ProjectTasksTable')).toBeInTheDocument();
  });

  test('should render OpenThrottlePagination when totalTaskCount > limit', async () => {
    const user = userEvent.setup();
    const component = render(
      <MemoryRouter>
        <ProjectDetail
          actionData={undefined}
          loaderData={{
            ...defaultLoaderData,
            limit: 2,
            page: 1,
            project: mockProject,
            projectTasks: [
              mockProjectTask,
              { ...mockProjectTask, id: 'task-2' },
            ],
            totalTaskCount: 25,
          }}
          matches={defaultMatches}
          params={{ projectId: mockProject.id }}
        />
      </MemoryRouter>,
    );
    await user.click(component.getByRole('tab', { name: 'Tasks' }));
    expect(component.getByTestId('OpenThrottlePagination')).toBeInTheDocument();
  });

  test('should render empty state when project is not found', () => {
    const component = render(
      <MemoryRouter>
        <ProjectDetail
          actionData={undefined}
          loaderData={{ ...defaultLoaderData, project: null, projectTasks: [] }}
          matches={defaultMatches}
          params={{ projectId: mockProject.id }}
        />
      </MemoryRouter>,
    );
    expect(
      component.getByText(PROJECT_NOT_FOUND_COPY.title),
    ).toBeInTheDocument();
    expect(
      component.getByText(PROJECT_NOT_FOUND_COPY.description),
    ).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
  });
});
