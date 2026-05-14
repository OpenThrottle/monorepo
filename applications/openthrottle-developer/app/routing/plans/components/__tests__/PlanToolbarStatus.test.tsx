import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanToolbarStatus } from '../PlanToolbarStatus';
import type { PlanToolbarStatusProps } from '../PlanToolbarStatus';

describe('PlanToolbarStatus Component', () => {
  let component: RenderResult;
  let props: PlanToolbarStatusProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanToolbarStatus {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
