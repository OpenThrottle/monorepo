import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProjectNotFound } from '../ProjectNotFound';
import type { ProjectNotFoundProps } from '../ProjectNotFound';
import { PROJECT_NOT_FOUND_COPY } from '~/routing/projects/data/data.copy';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('ProjectNotFound Component', () => {
  let component: RenderResult;
  let props: ProjectNotFoundProps;

  beforeEach(() => {
    props = {};

    component = renderRoutesStub(<ProjectNotFound {...props} />);
  });

  test('should render not-found empty state and back link to projects list', () => {
    expect(
      component.getByRole('heading', { name: PROJECT_NOT_FOUND_COPY.title }),
    ).toBeInTheDocument();
    expect(
      component.getByText(PROJECT_NOT_FOUND_COPY.description),
    ).toBeInTheDocument();
    const backLink = component.getByRole('link', { name: 'Projects' });
    expect(backLink).toHaveAttribute('href', '/projects');
  });
});
