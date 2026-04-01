import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeHeroV3 } from '../HomeHeroV3';
import type { HomeHeroV3Props } from '../HomeHeroV3';

describe('HomeHeroV3 Component', () => {
  let component: RenderResult;
  let props: HomeHeroV3Props;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeHeroV3 {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders placeholder heading', () => {
    expect(component.getByTestId('HomeHeroV3')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'HomeHeroV3' }),
    ).toBeInTheDocument();
  });
});
