import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProjectDetailTabs } from './ProjectDetailTabs';
import type { ProjectDetailTabsProps } from './ProjectDetailTabs';

const mockProject: ProjectDetailTabsProps['project'] = {
  __typename: 'ProjectObject',
  createdAt: '2026-01-01T00:00:00.000Z',
  description: 'A test project.',
  id: 'project-1',
  name: 'Test Project',
  nxProjectName: null,
  tags: [],
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const mockTasks: ProjectDetailTabsProps['tasks'] = [
  {
    __typename: 'TaskObject',
    assignee: null,
    category: 'dev',
    createdAt: '2026-01-01T00:00:00.000Z',
    description: null,
    id: 'task-1',
    planId: 'plan-1',
    requirementsJson: '[]',
    summary: null,
    title: 'Task one',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('ProjectDetailTabs Component', () => {
  let component: RenderResult;
  let props: ProjectDetailTabsProps;

  beforeEach(() => {
    props = {
      limit: 20,
      page: 1,
      project: mockProject,
      tagVocabulary: [],
      tasks: mockTasks,
      totalTaskCount: 1,
    };

    const Component = () => <ProjectDetailTabs {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders the Overview tab with project name and description by default', () => {
    expect(
      component.getByRole('heading', { name: 'Test Project' }),
    ).toBeInTheDocument();
    expect(component.getByText('A test project.')).toBeInTheDocument();
  });

  test('switches to the Tasks tab and renders task rows', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('tab', { name: 'Tasks' }));

    expect(component.getByText('Task one')).toBeInTheDocument();
  });

  test('renders an empty state when there are no tasks', async () => {
    component.unmount();
    // eslint-disable-next-line react/no-multi-comp
    const Component = () => (
      <ProjectDetailTabs {...props} tasks={[]} totalTaskCount={0} />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
    const user = userEvent.setup();

    await user.click(component.getByRole('tab', { name: 'Tasks' }));

    expect(component.getByText('No tasks')).toBeInTheDocument();
  });
});
