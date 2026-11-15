import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { ProjectsEmpty } from '../ProjectsEmpty';

describe('ProjectsEmpty Component', () => {
  test('renders empty state and new project link', () => {
    const Component = () => {
      return <ProjectsEmpty />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByText('No projects yet')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'New project' }),
    ).toHaveAttribute('href', '/projects/create');
  });
});
