import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardIntroduction } from '../DashboardIntroduction';
import type { DashboardIntroductionProps } from '../DashboardIntroduction';

describe('DashboardIntroduction Component', () => {
  let component: RenderResult;
  let props: DashboardIntroductionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <DashboardIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
