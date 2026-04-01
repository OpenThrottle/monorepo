import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProjectNotFound } from '../ProjectNotFound';
import type { ProjectNotFoundProps } from '../ProjectNotFound';

describe('ProjectNotFound Component', () => {
  let component: RenderResult;
  let props: ProjectNotFoundProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ProjectNotFound {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render not-found empty state and back link to projects list', () => {
    expect(component.getByTestId('ProjectNotFound')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'Project not found' }),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        'The project you’re looking for doesn’t exist or was removed.',
      ),
    ).toBeInTheDocument();
    const backLink = component.getByRole('link', { name: 'Projects' });
    expect(backLink).toHaveAttribute('href', '/projects');
  });
});
