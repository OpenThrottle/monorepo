import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeBuiltWith } from '../HomeBuiltWith';
import type { HomeBuiltWithProps } from '../HomeBuiltWith';

describe('HomeBuiltWith Component', () => {
  let props: HomeBuiltWithProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeBuiltWith {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);
  });

  test('should render section heading', () => {
    expect(screen.getByTestId('HomeBuiltWith')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /Everything is built on OpenSource work/,
      }),
    ).toBeInTheDocument();
  });

  test('when technologies list is empty, should not render technology images', () => {
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
