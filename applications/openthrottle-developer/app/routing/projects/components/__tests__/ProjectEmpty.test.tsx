import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProjectEmpty } from '../ProjectEmpty';
import type { ProjectEmptyProps } from '../ProjectEmpty';

describe('ProjectEmpty Component', () => {
  let component: RenderResult;
  let props: ProjectEmptyProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ProjectEmpty {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render empty state with new project link when not searching', () => {
    expect(component.getByText('No projects yet')).toBeInTheDocument();
    expect(
      component.getByText('Create your first project to get started.'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'New project' }),
    ).toHaveAttribute('href', '/projects/create');
  });
});
