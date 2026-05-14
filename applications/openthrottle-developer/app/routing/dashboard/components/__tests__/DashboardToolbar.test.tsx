import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardToolbar } from '../DashboardToolbar';
import type { DashboardToolbarProps } from '../DashboardToolbar';

describe('DashboardToolbar Component', () => {
  let component: RenderResult;
  let props: DashboardToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <DashboardToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
