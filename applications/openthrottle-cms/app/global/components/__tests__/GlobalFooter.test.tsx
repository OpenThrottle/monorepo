import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import {
  ENV_SOURCE,
  OPEN_THROTTLE_GITHUB_URL,
  OPEN_THROTTLE_GITHUB_URL_DISCUSSIONS,
} from '@openthrottle/react-router-utils';
import { describe, expect, test } from 'vitest';
import { GlobalFooter } from '../GlobalFooter';

describe('GlobalFooter Component', () => {
  test('renders footer sections and key links', () => {
    const RoutesStub = createRoutesStub([
      { Component: () => <GlobalFooter />, path: '/' },
    ]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('GlobalFooter')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: /product/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: /community/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: /legal/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /openthrottle/i }),
    ).toHaveAttribute('href', ENV_SOURCE.APP_URL_DEVELOPER);
    expect(component.getByRole('link', { name: /github/i })).toHaveAttribute(
      'href',
      OPEN_THROTTLE_GITHUB_URL,
    );
    expect(
      component.getByRole('link', { name: /discussions/i }),
    ).toHaveAttribute('href', OPEN_THROTTLE_GITHUB_URL_DISCUSSIONS);
  });

  test('renders legal links to policy pages', () => {
    const RoutesStub = createRoutesStub([
      { Component: () => <GlobalFooter />, path: '/' },
    ]);
    const component = render(<RoutesStub />);

    expect(component.getByRole('link', { name: /privacy/i })).toHaveAttribute(
      'href',
      '/legal/privacy-policy',
    );
    expect(component.getByRole('link', { name: /terms/i })).toHaveAttribute(
      'href',
      '/legal/terms-of-use',
    );
  });
});
