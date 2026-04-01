import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeHeroV1 } from '../HomeHeroV1';
import type { HomeHeroV1Props } from '../HomeHeroV1';

describe('HomeHeroV1 Component', () => {
  let component: RenderResult;
  let props: HomeHeroV1Props;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeHeroV1 {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders hero headline and primary CTAs', () => {
    expect(component.getByTestId('HomeHeroV1')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: /context is king/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /coming soon/i }),
    ).toBeInTheDocument();
  });
});
