import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeHeroV4 } from '../HomeHeroV4';
import type { HomeHeroV4Props } from '../HomeHeroV4';

describe('HomeHeroV4 Component', () => {
  let component: RenderResult;
  let props: HomeHeroV4Props;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeHeroV4 {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders placeholder heading', () => {
    expect(component.getByTestId('HomeHeroV4')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'HomeHeroV4' }),
    ).toBeInTheDocument();
  });
});
