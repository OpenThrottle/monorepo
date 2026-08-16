import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import ProjectDetail from '../projects.$projectId._index';
import { PROJECT_NOT_FOUND_COPY } from '~/routing/projects/data/data.copy';

const mockProject = {
  __typename: 'ProjectObject' as const,
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Test project description',
  id: 'proj-detail-1',
  name: 'Test Project',
  nxProjectName: null,
  tags: [
    {
      confidence: null,
      dimension: 'domain',
      id: 'pt-1',
      source: 'human',
      tag: 'backend',
    },
  ],
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
  tagVocabulary: [
    { dimension: 'domain', id: 'v-1', tag: 'backend' },
    { dimension: 'phase', id: 'v-2', tag: 'design' },
  ],
  totalTaskCount: 0,
};

type LoaderData = {
  limit: number;
  page: number;
  project: typeof mockProject | null;
  projectTasks: (typeof mockProjectTask)[];
  tagVocabulary: { dimension: string; id: string; tag: string }[];
  totalTaskCount: number;
};

const renderRoute = (
  loaderData: LoaderData,
): {
  submitted: {
    intent: FormDataEntryValue | null;
    tag: FormDataEntryValue | null;
  }[];
} => {
  const submitted: {
    intent: FormDataEntryValue | null;
    tag: FormDataEntryValue | null;
  }[] = [];

  const RoutesStub = createRoutesStub([
    {
      Component: ProjectDetail,
      action: async ({ request }: { request: Request }) => {
        const formData = await request.formData();
        submitted.push({
          intent: formData.get('intent'),
          tag: formData.get('tag'),
        });
        return { projectTagUpdated: true };
      },
      loader: () => loaderData,
      path: '/projects/:projectId',
    },
  ]);

  render(<RoutesStub initialEntries={['/projects/proj-detail-1']} />);
  return { submitted };
};

describe('routes/projects.$projectId._index.tsx', () => {
  test('should render project detail when project exists', async () => {
    renderRoute(defaultLoaderData);
    expect(
      await screen.findByRole('tablist', { name: 'Project sections' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Test Project').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText('Test project description')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'proj-detail-1' }),
    ).toBeInTheDocument();
  });

  test('should render Overview and Tasks tabs', async () => {
    renderRoute(defaultLoaderData);
    expect(
      await screen.findByRole('tab', { name: 'Overview' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tasks' })).toBeInTheDocument();
  });

  test('should show tasks tab content with empty state when no tasks', async () => {
    const user = userEvent.setup();
    renderRoute(defaultLoaderData);
    await user.click(await screen.findByRole('tab', { name: 'Tasks' }));
    expect(screen.getByText('No tasks')).toBeInTheDocument();
    expect(
      screen.getByText('This project has no tasks yet.'),
    ).toBeInTheDocument();
  });

  test('should show ProjectTasksTable when projectTasks are provided', async () => {
    const user = userEvent.setup();
    renderRoute({
      ...defaultLoaderData,
      projectTasks: [mockProjectTask],
      totalTaskCount: 1,
    });
    await user.click(await screen.findByRole('tab', { name: 'Tasks' }));
    expect(screen.getByText('A project task')).toBeInTheDocument();
    expect(screen.getByTestId('ProjectTasksTable')).toBeInTheDocument();
  });

  test('should render OpenThrottlePagination when totalTaskCount > limit', async () => {
    const user = userEvent.setup();
    renderRoute({
      ...defaultLoaderData,
      limit: 2,
      projectTasks: [mockProjectTask, { ...mockProjectTask, id: 'task-2' }],
      totalTaskCount: 25,
    });
    await user.click(await screen.findByRole('tab', { name: 'Tasks' }));
    expect(screen.getByTestId('OpenThrottlePagination')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-2 of 25 tasks')).toBeInTheDocument();
  });

  test('should render empty state when project is not found', async () => {
    renderRoute({ ...defaultLoaderData, project: null });
    expect(
      await screen.findByText(PROJECT_NOT_FOUND_COPY.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(PROJECT_NOT_FOUND_COPY.description),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
  });

  describe('tag editor', () => {
    test('renders existing project tags', async () => {
      renderRoute(defaultLoaderData);
      expect(await screen.findByTestId('PlanTagChips')).toBeInTheDocument();
      expect(screen.getByText('backend')).toBeInTheDocument();
    });

    test('removing a tag submits the removeProjectTag intent', async () => {
      const user = userEvent.setup();
      const { submitted } = renderRoute(defaultLoaderData);
      await user.click(
        await screen.findByRole('button', { name: 'Remove tag backend' }),
      );
      await waitFor(() => expect(submitted).toHaveLength(1));
      expect(submitted[0]).toEqual({
        intent: 'removeProjectTag',
        tag: 'backend',
      });
    });

    test('adding a tag submits the addProjectTag intent', async () => {
      const user = userEvent.setup();
      const { submitted } = renderRoute(defaultLoaderData);
      await user.selectOptions(
        await screen.findByRole('combobox', { name: 'Add a tag' }),
        'design',
      );
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await waitFor(() => expect(submitted).toHaveLength(1));
      expect(submitted[0]).toEqual({ intent: 'addProjectTag', tag: 'design' });
    });
  });
});
