import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanToolbarSortBy } from '../PlanToolbarSortBy';
import type { PlanToolbarSortByProps } from '../PlanToolbarSortBy';

describe('PlanToolbarSortBy Component', () => {
  let component: RenderResult;
  let props: PlanToolbarSortByProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanToolbarSortBy {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
