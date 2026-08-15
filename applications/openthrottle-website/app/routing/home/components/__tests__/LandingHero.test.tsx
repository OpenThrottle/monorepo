import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { LANDING_HERO } from '~/routing/home/data/data.landing';
import { LandingHero } from '../LandingHero';

const renderHero = (element: React.ReactElement): RenderResult => {
  const RoutesStub = createRoutesStub([
    { Component: () => element, path: '/' },
  ]);

  return render(<RoutesStub />);
};

describe('LandingHero Component', () => {
  test('renders the first headline, lede, and GitHub CTA', () => {
    const component = renderHero(<LandingHero headlineIntervalMs={0} />);
    const first = LANDING_HERO.headlines[0] ?? '';

    expect(component.getByTestId('LandingHero')).toBeInTheDocument();
    expect(first).toBeDefined();
    expect(component.getByRole('heading', { name: first })).toBeInTheDocument();
    expect(component.getByText(LANDING_HERO.lede)).toBeInTheDocument();

    const github = component.getByRole('link', {
      name: LANDING_HERO.ctas.primary.label,
    });

    expect(github).toHaveAttribute('target', '_blank');
  });

  test('clicking the headline advances to the next line', async () => {
    const user = userEvent.setup();
    const component = renderHero(<LandingHero headlineIntervalMs={0} />);
    const first = LANDING_HERO.headlines[0] ?? '';
    const second = LANDING_HERO.headlines[1] ?? '';

    await user.click(component.getByRole('button', { name: first }));

    expect(
      component.getByRole('heading', { name: second }),
    ).toBeInTheDocument();
  });

  test('prefers the lede override when provided', () => {
    const component = renderHero(
      <LandingHero headlineIntervalMs={0} lede="A custom hero lede" />,
    );

    expect(component.getByText('A custom hero lede')).toBeInTheDocument();
  });
});
