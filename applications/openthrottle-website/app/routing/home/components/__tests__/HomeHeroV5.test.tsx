import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeHeroV5 } from '../HomeHeroV5';
import type { HomeHeroV5Props } from '../HomeHeroV5';

describe('HomeHeroV5 Component', () => {
  let component: RenderResult;
  let props: HomeHeroV5Props;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeHeroV5 {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders placeholder heading', () => {
    expect(component.getByTestId('HomeHeroV5')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'HomeHeroV5' }),
    ).toBeInTheDocument();
  });
});
