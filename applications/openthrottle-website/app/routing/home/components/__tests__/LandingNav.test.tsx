import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { LANDING_NAV } from '~/routing/home/data/data.landing';

const isBlogEnabled = vi.fn();

vi.mock('~/global/utils/blog-enabled', () => ({ isBlogEnabled }));

const { LandingNav } = await import('../LandingNav');

const renderNav = () => {
  const Wrapped = () => <LandingNav />;
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

  return render(<RoutesStub />);
};

describe('LandingNav Component', () => {
  beforeEach(() => {
    isBlogEnabled.mockReset();
    isBlogEnabled.mockReturnValue(false);
  });

  test('renders the brand and every ungated nav link from data', () => {
    const component = renderNav();

    expect(component.getByTestId('LandingNav')).toBeInTheDocument();

    for (const link of LANDING_NAV.links.filter((l) => !l.requiresBlog)) {
      expect(
        component.getByRole('link', { name: link.label }),
      ).toBeInTheDocument();
    }
  });

  test('opens the external GitHub link in a new tab', () => {
    const github = renderNav().getByRole('link', { name: 'GitHub' });

    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noreferrer');
  });

  describe('Blog link', () => {
    test('is hidden while the blog switch is off', () => {
      const component = renderNav();

      expect(
        component.queryByRole('link', { name: 'Blog' }),
      ).not.toBeInTheDocument();
    });

    test('links to /blog when the blog switch is on', () => {
      isBlogEnabled.mockReturnValue(true);

      const component = renderNav();

      expect(component.getByRole('link', { name: 'Blog' })).toHaveAttribute(
        'href',
        '/blog',
      );
    });
  });
});
