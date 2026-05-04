import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanToggleLayout } from '../PlanToggleLayout';
import type { PlanToggleLayoutProps } from '../PlanToggleLayout';

describe('PlanToggleLayout Component', () => {
  let component: RenderResult;
  let props: PlanToggleLayoutProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanToggleLayout {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
