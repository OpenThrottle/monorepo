import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { ProjectDetailViewProps } from '../ProjectDetailView';
import { ProjectDetailView } from '../ProjectDetailView';

const mockProject: ProjectDetailViewProps['project'] = {
  __typename: 'ProjectObject',
  createdAt: '2026-01-01T00:00:00.000Z',
  description: 'A test project.',
  id: 'project-1',
  name: 'Test Project',
  repositories: [],
  tags: [],
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('ProjectDetailView Component', () => {
  let component: RenderResult;
  let props: ProjectDetailViewProps;

  beforeEach(() => {
    props = {
      availablePlans: [],
      availableRepositories: [],
      plans: [
        {
          __typename: 'PlanObject',
          id: 'plan-1',
          projectSortOrder: 1000,
          status: 'PENDING',
          taskCount: 2,
          tasksCompletedCount: 0,
          title: 'Plan one',
        },
      ],
      project: mockProject,
      tagVocabulary: [],
    };

    const Component = () => {
      return <ProjectDetailView {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders the project name and description', () => {
    expect(
      component.getByRole('heading', { name: 'Test Project' }),
    ).toBeInTheDocument();
    expect(component.getByText('A test project.')).toBeInTheDocument();
  });

  test('renders the repositories and plans sections, with no tasks table', () => {
    expect(
      component.getByRole('region', { name: 'Repositories' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('region', { name: 'Plans' }),
    ).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'Plan one' })).toHaveAttribute(
      'href',
      '/plans/plan-1',
    );
    expect(
      component.queryByTestId('ProjectTasksTable'),
    ).not.toBeInTheDocument();
    expect(component.queryByRole('tab')).not.toBeInTheDocument();
  });
});
