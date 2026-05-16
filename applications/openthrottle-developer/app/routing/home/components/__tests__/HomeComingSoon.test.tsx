import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeComingSoon } from '../HomeComingSoon';
import type { HomeComingSoonProps } from '../HomeComingSoon';

describe('HomeComingSoon Component', () => {
  let props: HomeComingSoonProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeComingSoon {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);
  });

  test('should render coming-soon section with headline and body copy', () => {
    expect(screen.getByTestId('HomeComingSoon')).toBeInTheDocument();
    expect(screen.getByText('Building...')).toBeInTheDocument();
    expect(
      screen.getByText(/We're building something great for you/),
    ).toBeInTheDocument();
  });
});
