import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanStats } from '../PlanStats';
import type { PlanStatsProps } from '../PlanStats';

describe('PlanStats Component', () => {
  let component: RenderResult;
  let props: PlanStatsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanStats {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
