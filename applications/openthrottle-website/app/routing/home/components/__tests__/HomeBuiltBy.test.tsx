import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeBuiltBy } from '../HomeBuiltBy';
import type { HomeBuiltByProps } from '../HomeBuiltBy';

describe('HomeBuiltBy Component', () => {
  let component: RenderResult;
  let props: HomeBuiltByProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeBuiltBy {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders heading and built-by anchor id', () => {
    expect(component.getByTestId('HomeBuiltBy')).toHaveAttribute(
      'id',
      'built-by-engineers',
    );
    expect(
      component.getByRole('heading', {
        name: 'Built By Engineers, For Engineers',
      }),
    ).toBeInTheDocument();
  });
});
