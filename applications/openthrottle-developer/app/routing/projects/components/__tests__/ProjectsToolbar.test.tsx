import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { createRoutesStub } from 'react-router';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { ProjectsToolbar } from '../ProjectsToolbar';
import type { ProjectsToolbarProps } from '../ProjectsToolbar';

const DEFAULT_PROPS: ProjectsToolbarProps = {
  limit: 5,
  page: 1,
  search: '',
  sortBy: 'name',
  sortOrder: 'asc',
  view: 'table',
};

describe('ProjectsToolbar Component', () => {
  let component: RenderResult;
  let props: ProjectsToolbarProps;

  beforeEach(() => {
    props = { ...DEFAULT_PROPS };

    const Component = () => <ProjectsToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render toolbar shell with data-testid', () => {
    expect(component.getByTestId('ProjectsToolbar')).toBeInTheDocument();
  });

  test('should render search form and input', () => {
    const form = component.getByRole('search');
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute('action', '/projects');
    expect(form).toHaveAttribute('method', 'get');
    const input = component.getByPlaceholderText(/search projects/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('name', 'q');
  });

  test('should render single sort dropdown', () => {
    const sortDropdown = component.getByRole('combobox', {
      name: /sort projects/i,
    });
    expect(sortDropdown).toBeInTheDocument();
  });
});
