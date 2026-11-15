import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { HomeBuiltWithProps } from '../HomeBuiltWith';
import { HomeBuiltWith } from '../HomeBuiltWith';

describe('HomeBuiltWith Component', () => {
  let component: RenderResult;
  let props: HomeBuiltWithProps;

  beforeEach(() => {
    props = {};

    const Component = () => {
      return <HomeBuiltWith {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render section heading', () => {
    expect(component.getByTestId('HomeBuiltWith')).toBeInTheDocument();
    expect(
      component.getByRole('heading', {
        level: 2,
        name: /Everything is built on OpenSource work/,
      }),
    ).toBeInTheDocument();
  });

  test('when technologies list is empty, should not render technology images', () => {
    expect(component.queryAllByRole('img')).toHaveLength(0);
    expect(component.queryAllByRole('link')).toHaveLength(0);
  });
});
