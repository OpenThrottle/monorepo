import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProjectToolbar } from '../ProjectToolbar';
import type { ProjectToolbarProps } from '../ProjectToolbar';

describe('ProjectToolbar Component', () => {
  let component: RenderResult;
  let props: ProjectToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ProjectToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render heading and data-testid', () => {
    expect(component.getByTestId('ProjectToolbar')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 2, name: 'ProjectToolbar' }),
    ).toBeInTheDocument();
  });
});
