import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { LandingHero } from '../LandingHero';

const renderHero = (element: React.ReactElement): RenderResult => {
  const RoutesStub = createRoutesStub([
    { Component: () => element, path: '/' },
  ]);

  return render(<RoutesStub />);
};

describe('LandingHero Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderHero(<LandingHero />);
  });

  test('renders the wordmark, headline, and default lede', () => {
    expect(component.getByTestId('LandingHero')).toBeInTheDocument();
    expect(component.getByText('Throttle')).toBeInTheDocument();
    expect(
      component.getByText(/from idea to shipped commit/i),
    ).toBeInTheDocument();
    expect(component.getByText(/self-hostable harness/i)).toBeInTheDocument();
  });

  test('renders the GitHub CTA as an external link', () => {
    const github = component.getByRole('link', { name: /view on github/i });

    expect(github).toHaveAttribute('target', '_blank');
  });

  test('prefers the lede override when provided', () => {
    const scoped = renderHero(<LandingHero lede="A custom hero lede" />);

    expect(scoped.getByText('A custom hero lede')).toBeInTheDocument();
  });
});
