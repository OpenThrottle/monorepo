import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProjectsCardGrid } from '../ProjectsCardGrid';
import type { ProjectsCardGridProps } from '../ProjectsCardGrid';
import type { ProjectCardFragment } from '~/__generated__/graphql';

const mockProjects: ProjectCardFragment[] = [
  {
    __typename: 'ProjectObject',
    createdAt: '2025-01-01T00:00:00Z',
    description: 'First project description',
    id: 'proj-1',
    name: 'First Project',
    nxProjectName: 'applications/openthrottle-developer',
    updatedAt: '2025-01-02T00:00:00Z',
  },
  {
    __typename: 'ProjectObject',
    createdAt: '2025-01-03T00:00:00Z',
    description: null,
    id: 'proj-2',
    name: 'Second Project',
    nxProjectName: null,
    updatedAt: '2025-01-04T00:00:00Z',
  },
];

describe('ProjectsCardGrid Component', () => {
  let props: ProjectsCardGridProps;

  beforeEach(() => {
    props = { projects: [] };
  });

  test('should render with empty projects', () => {
    const Component = () => <ProjectsCardGrid {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);
    expect(component.getByTestId('ProjectsCardGrid')).toBeInTheDocument();
    expect(component.container.querySelectorAll('[data-testid="ProjectsCardGrid"] > *')).toHaveLength(0);
  });

  test('should render project cards with name, badge, and View link', () => {
    props.projects = mockProjects;
    const Component = () => <ProjectsCardGrid {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);
    expect(component.getByTestId('ProjectsCardGrid')).toBeInTheDocument();
    expect(component.getByText('First Project')).toBeInTheDocument();
    expect(component.getByText('Second Project')).toBeInTheDocument();
    expect(component.getByText('First project description')).toBeInTheDocument();
    const viewLinks = component.getAllByRole('link', { name: 'View' });
    expect(viewLinks).toHaveLength(2);
    expect(viewLinks[0]).toHaveAttribute('href', '/projects/proj-1');
    expect(viewLinks[1]).toHaveAttribute('href', '/projects/proj-2');
  });
});
