import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanToolbarSearch } from '../PlanToolbarSearch';
import type { PlanToolbarSearchProps } from '../PlanToolbarSearch';

describe('PlanToolbarSearch Component', () => {
  let component: RenderResult;
  let props: PlanToolbarSearchProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanToolbarSearch {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
