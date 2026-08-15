import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import Component from '../_index';

describe('routes/_index.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([
      {
        Component,
        index: true,
        loader: () => ({
          introduction: 'This is a test intro',
          repo: 'openthrottle/example-repo',
        }),
        path: '/',
      },
    ]);

    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('renders the landing sections with the hero GitHub CTA', async () => {
    expect(
      await component.findByRole('link', { name: /view on github/i }),
    ).toBeInTheDocument();

    // Each translated section is present.
    expect(component.getByTestId('LandingHero')).toBeInTheDocument();
    expect(component.getByTestId('LandingPromise')).toBeInTheDocument();
    expect(component.getByTestId('LandingFlow')).toBeInTheDocument();
    expect(component.getByTestId('LandingSurfaces')).toBeInTheDocument();
    expect(component.getByTestId('LandingClose')).toBeInTheDocument();
  });

  test('threads the loader repo into the self-host clone CTA', async () => {
    expect(
      await component.findByRole('link', { name: /clone the monorepo/i }),
    ).toHaveAttribute('href', 'https://github.com/openthrottle/example-repo');
  });

  test('threads the loader introduction into the self-host lede', async () => {
    expect(
      await component.findByText('This is a test intro'),
    ).toBeInTheDocument();
  });
});
