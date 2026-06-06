import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleBreadcrumbs } from '../OpenThrottleBreadcrumbs';
import type { OpenThrottleBreadcrumbsProps } from '../OpenThrottleBreadcrumbs';

describe('OpenThrottleBreadcrumbs Component', () => {
  let component: RenderResult;
  let props: OpenThrottleBreadcrumbsProps;

  beforeEach(() => {
    props = { children: null, links: [] };

    const Component = () => <OpenThrottleBreadcrumbs {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
