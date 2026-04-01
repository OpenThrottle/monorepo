import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardStatCard } from '../DashboardStatCard';
import type { DashboardStatCardProps } from '../DashboardStatCard';

describe('DashboardStatCard Component', () => {
  let component: RenderResult;
  let props: DashboardStatCardProps;

  beforeEach(() => {
    props = {
      description: 'A test description',
      heading: 'A test heading',
    };

    const Component = () => <DashboardStatCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
