import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { ProjectsEmpty } from '../ProjectsEmpty';

describe('ProjectsEmpty Component', () => {
  test('renders empty state and new project link', () => {
    const Component = () => <ProjectsEmpty />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New project' })).toHaveAttribute(
      'href',
      '/projects/create',
    );
  });
});
