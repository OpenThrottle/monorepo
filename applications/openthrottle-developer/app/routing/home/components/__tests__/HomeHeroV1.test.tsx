import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeHeroV1 } from '../HomeHeroV1';
import type { HomeHeroV1Props } from '../HomeHeroV1';

describe('HomeHeroV1 Component', () => {
  let props: HomeHeroV1Props;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeHeroV1 {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);
  });

  test('should render hero with primary heading and intro copy', () => {
    expect(screen.getByTestId('HomeHeroV1')).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/Stop/);
    expect(heading).toHaveTextContent(/Plan/);

    expect(
      screen.getByText(/Postgres-backed plans knowledge base/),
    ).toBeInTheDocument();
  });
});
