import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeVelocity } from '../HomeVelocity';
import type { HomeVelocityProps } from '../HomeVelocity';

describe('HomeVelocity Component', () => {
  let component: RenderResult;
  let props: HomeVelocityProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeVelocity {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders velocity headline', () => {
    expect(component.getByTestId('HomeVelocity')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: '10x to 100x Velocity' }),
    ).toBeInTheDocument();
  });
});
