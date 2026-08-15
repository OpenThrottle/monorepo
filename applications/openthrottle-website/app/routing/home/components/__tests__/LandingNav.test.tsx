import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { LANDING_NAV } from '~/routing/home/data/data.landing';
import { LandingNav } from '../LandingNav';

describe('LandingNav Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Wrapped = () => <LandingNav />;
    const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders the brand and every nav link from data', () => {
    expect(component.getByTestId('LandingNav')).toBeInTheDocument();

    for (const link of LANDING_NAV.links) {
      expect(
        component.getByRole('link', { name: link.label }),
      ).toBeInTheDocument();
    }
  });

  test('opens the external GitHub link in a new tab', () => {
    const github = component.getByRole('link', { name: 'GitHub' });

    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noreferrer');
  });
});
