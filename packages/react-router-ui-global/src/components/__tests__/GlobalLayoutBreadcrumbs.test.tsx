import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalLayoutBreadcrumbs } from '../GlobalLayoutBreadcrumbs';
import type { GlobalLayoutBreadcrumbsProps } from '../GlobalLayoutBreadcrumbs';

describe('GlobalLayoutBreadcrumbs Component', () => {
  let component: RenderResult;
  let props: GlobalLayoutBreadcrumbsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalLayoutBreadcrumbs {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
