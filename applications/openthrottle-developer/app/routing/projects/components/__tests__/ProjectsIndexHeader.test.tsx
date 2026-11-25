import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PROJECTS_INDEX_COPY } from '~/routing/projects/data/copy';

import { ProjectsIndexHeader } from '../ProjectsIndexHeader';

describe('ProjectsIndexHeader Component', () => {
  test('links New project to the create route and Add repository to settings', () => {
    const Component = () => {
      return <ProjectsIndexHeader />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByRole('heading', { name: PROJECTS_INDEX_COPY.heading }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: PROJECTS_INDEX_COPY.newProject }),
    ).toHaveAttribute('href', '/projects/create');
    expect(
      component.getByRole('link', { name: PROJECTS_INDEX_COPY.addRepository }),
    ).toHaveAttribute('href', '/settings/repositories');
  });
});
