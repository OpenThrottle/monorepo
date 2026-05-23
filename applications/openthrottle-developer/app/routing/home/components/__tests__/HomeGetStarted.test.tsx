import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeGetStarted } from '../HomeGetStarted';
import type { HomeGetStartedProps } from '../HomeGetStarted';

describe('HomeGetStarted Component', () => {
  let props: HomeGetStartedProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeGetStarted {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);
  });

  test('should render placeholder section', () => {
    expect(screen.getByTestId('HomeGetStarted')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'HomeGetStarted' }),
    ).toBeInTheDocument();
  });
});
