import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProjectForm } from '../ProjectForm';
import type { ProjectFormProps } from '../ProjectForm';

describe('ProjectForm Component', () => {
  let component: RenderResult;
  let props: ProjectFormProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ProjectForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render create form fields and actions', () => {
    expect(component.getByTestId('ProjectForm')).toBeInTheDocument();
    expect(component.getByLabelText('Name')).toBeInTheDocument();
    expect(
      component.getByLabelText('Description (optional)'),
    ).toBeInTheDocument();
    expect(
      component.getByLabelText('NX project name (optional)'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Create project' }),
    ).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/projects',
    );
  });
});
