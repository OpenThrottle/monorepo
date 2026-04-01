import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeHeroV2 } from '../HomeHeroV2';
import type { HomeHeroV2Props } from '../HomeHeroV2';

describe('HomeHeroV2 Component', () => {
  let component: RenderResult;
  let props: HomeHeroV2Props;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeHeroV2 {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders placeholder heading', () => {
    expect(component.getByTestId('HomeHeroV2')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'HomeHeroV2' }),
    ).toBeInTheDocument();
  });
});
