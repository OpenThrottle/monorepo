import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProjectsEmpty } from '../ProjectsEmpty';
import type { ProjectsEmptyProps } from '../ProjectsEmpty';

describe('ProjectsEmpty Component', () => {
  let component: RenderResult;
  let props: ProjectsEmptyProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ProjectsEmpty {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
