import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlansStats } from '../PlansStats';
import type { PlansStatsProps } from '../PlansStats';

describe('PlansStats Component', () => {
  let component: RenderResult;
  let props: PlansStatsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlansStats {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
