import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProjectsTable } from '../ProjectsTable';
import type { ProjectsTableProps } from '../ProjectsTable';
import type { ProjectCardFragment } from '~/__generated__/graphql';

const mockProjects: ProjectCardFragment[] = [
  {
    __typename: 'ProjectObject',
    createdAt: '2025-01-01T00:00:00Z',
    description: 'First project description',
    id: 'proj-1',
    name: 'First Project',
    nxProjectName: 'applications/openthrottle-developer',
    plans: [
      { __typename: 'PlanObject', title: 'Plan A' },
      { __typename: 'PlanObject', title: 'Plan B' },
    ],
    tasks: [
      { __typename: 'TaskObject', title: 'Task 1' },
      { __typename: 'TaskObject', title: 'Task 2' },
      { __typename: 'TaskObject', title: 'Task 3' },
    ],
    updatedAt: '2025-01-02T00:00:00Z',
  },
  {
    __typename: 'ProjectObject',
    createdAt: '2025-01-03T00:00:00Z',
    description: null,
    id: 'proj-2',
    name: 'Second Project',
    nxProjectName: null,
    plans: [],
    tasks: [],
    updatedAt: '2025-01-04T00:00:00Z',
  },
];

describe('ProjectsTable Component', () => {
  let component: RenderResult;
  let props: ProjectsTableProps;

  beforeEach(() => {
    props = { projects: [] };

    const Component = () => <ProjectsTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders ProjectsTable card and table when empty', () => {
    expect(component.getByTestId('ProjectsTable')).toBeInTheDocument();
    expect(component.getByRole('table')).toBeInTheDocument();
  });

  test('renders table structure with column headers', () => {
    expect(
      component.getAllByRole('columnheader', { name: 'Context' }).length,
    ).toBeGreaterThan(0);
    expect(
      component.getAllByRole('columnheader', { name: 'Plans' }).length,
    ).toBeGreaterThan(0);
    expect(
      component.getAllByRole('columnheader', { name: 'Tasks' }).length,
    ).toBeGreaterThan(0);
    expect(
      component.getAllByRole('columnheader', { name: 'Updated' }).length,
    ).toBeGreaterThan(0);
  });

  test('shows no results when projects is empty', () => {
    expect(component.getByText('No projects yet')).toBeInTheDocument();
  });

  test('renders projects from props when provided', () => {
    const propsWithProjects: ProjectsTableProps = { projects: mockProjects };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <ProjectsTable {...propsWithProjects} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByRole, getByText } = render(<RoutesStub />);

    const firstProjectLink = getByRole('link', {
      name: 'View project: First Project',
    });
    expect(firstProjectLink).toHaveAttribute('href', '/projects/proj-1');
    const secondProjectLink = getByRole('link', {
      name: 'View project: Second Project',
    });
    expect(secondProjectLink).toHaveAttribute('href', '/projects/proj-2');
    expect(getByText('First project description')).toBeDefined();
  });

  test('renders plan and task counts and updated date', () => {
    const propsWithProjects: ProjectsTableProps = { projects: mockProjects };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <ProjectsTable {...propsWithProjects} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByText, getAllByText, getAllByRole } = render(<RoutesStub />);

    expect(getByText('2')).toBeInTheDocument();
    expect(getByText('3')).toBeInTheDocument();
    expect(getAllByText('0').length).toBeGreaterThanOrEqual(2);
    expect(
      getAllByRole('columnheader', { name: 'Plans' }).length,
    ).toBeGreaterThan(0);
    expect(
      getAllByRole('columnheader', { name: 'Tasks' }).length,
    ).toBeGreaterThan(0);
    expect(
      getAllByRole('columnheader', { name: 'Updated' }).length,
    ).toBeGreaterThan(0);
    // Updated column shows relative time (e.g. "over 1 year ago")
    const updatedCells = getAllByText(/ago$/);
    expect(updatedCells.length).toBe(2);
  });
});
