import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PROJECT_NOT_FOUND_COPY } from '~/routing/projects/data/data.copy';

import ProjectDetail from '../projects.$projectId._index';

const mockProject = {
  __typename: 'ProjectObject' as const,
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Test project description',
  id: 'proj-detail-1',
  name: 'Test Project',
  repositories: [],
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

const defaultLoaderData = {
  availablePlans: [],
  availableRepositories: [],
  project: mockProject,
  projectPlans: [],
  tagVocabulary: [
    { dimension: 'domain', id: 'v-1', tag: 'backend' },
    { dimension: 'phase', id: 'v-2', tag: 'design' },
  ],
};

type LoaderData = {
  availablePlans: {
    id: string;
    projectId: string | null;
    status: string;
    title: string;
  }[];
  availableRepositories: {
    defaultBranch: string | null;
    id: string;
    name: string;
    normalizedRemoteUrl: string | null;
  }[];
  project: typeof mockProject | null;
  projectPlans: {
    id: string;
    projectSortOrder: number | null;
    status: string;
    taskCount: number;
    tasksCompletedCount: number;
    title: string;
  }[];
  tagVocabulary: { dimension: string; id: string; tag: string }[];
};

const renderRoute = (
  loaderData: LoaderData,
): {
  component: RenderResult;
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

  const component = render(
    <RoutesStub initialEntries={['/projects/proj-detail-1']} />,
  );
  return { component, submitted };
};

describe('routes/projects.$projectId._index.tsx', () => {
  test('should render project detail when project exists', async () => {
    const { component } = renderRoute(defaultLoaderData);
    expect(
      await component.findByTestId('ProjectPlansList'),
    ).toBeInTheDocument();
    expect(
      component.getAllByText('Test Project').length,
    ).toBeGreaterThanOrEqual(1);
    expect(component.getByText('Test project description')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'proj-detail-1' }),
    ).toBeInTheDocument();
  });

  test('should render repositories and plans sections instead of tabs', async () => {
    const { component } = renderRoute(defaultLoaderData);
    expect(
      await component.findByRole('region', { name: 'Repositories' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('region', { name: 'Plans' }),
    ).toBeInTheDocument();
    expect(component.queryByRole('tab')).not.toBeInTheDocument();
  });

  test('should list the project plans in order', async () => {
    const { component } = renderRoute({
      ...defaultLoaderData,
      projectPlans: [
        {
          id: 'plan-1',
          projectSortOrder: 1000,
          status: 'PENDING',
          taskCount: 3,
          tasksCompletedCount: 1,
          title: 'First plan',
        },
      ],
    });
    expect(
      await component.findByRole('link', { name: 'First plan' }),
    ).toBeInTheDocument();
  });

  test('should render empty state when project is not found', async () => {
    const { component } = renderRoute({ ...defaultLoaderData, project: null });
    expect(
      await component.findByText(PROJECT_NOT_FOUND_COPY.title),
    ).toBeInTheDocument();
    expect(
      component.getByText(PROJECT_NOT_FOUND_COPY.description),
    ).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
  });

  describe('tag editor', () => {
    test('renders existing project tags', async () => {
      const { component } = renderRoute(defaultLoaderData);
      expect(await component.findByTestId('PlanTagChips')).toBeInTheDocument();
      expect(component.getByText('backend')).toBeInTheDocument();
    });

    test('removing a tag submits the removeProjectTag intent', async () => {
      const user = userEvent.setup();
      const { component, submitted } = renderRoute(defaultLoaderData);
      await user.click(
        await component.findByRole('button', { name: 'Remove tag backend' }),
      );
      await waitFor(() => expect(submitted).toHaveLength(1));
      expect(submitted[0]).toEqual({
        intent: 'removeProjectTag',
        tag: 'backend',
      });
    });

    test('adding a tag submits the addProjectTag intent', async () => {
      const user = userEvent.setup();
      const { component, submitted } = renderRoute(defaultLoaderData);
      await user.selectOptions(
        await component.findByRole('combobox', { name: 'Add a tag' }),
        'design',
      );
      await user.click(component.getByRole('button', { name: 'Add' }));
      await waitFor(() => expect(submitted).toHaveLength(1));
      expect(submitted[0]).toEqual({ intent: 'addProjectTag', tag: 'design' });
    });
  });
});
