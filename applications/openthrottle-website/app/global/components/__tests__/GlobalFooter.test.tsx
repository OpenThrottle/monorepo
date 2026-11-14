import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { GLOBAL_FOOTER } from '../../data/data.copy';
import type { GlobalFooterProps } from '../GlobalFooter';

const isBlogEnabled = vi.fn();

vi.mock('~/global/utils/blog-enabled', () => ({ isBlogEnabled }));

const { GlobalFooter } = await import('../GlobalFooter');

const renderFooter = (props: GlobalFooterProps = {}) => {
  const Component = () => {
    return <GlobalFooter {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('GlobalFooter Component', () => {
  beforeEach(() => {
    isBlogEnabled.mockReset();
    isBlogEnabled.mockReturnValue(false);
  });

  test('renders brand and tagline', () => {
    const component = renderFooter();

    expect(component.getByTestId('GlobalFooter')).toBeInTheDocument();
    expect(component.getByRole('contentinfo')).toBeInTheDocument();
    expect(component.getByText('Open')).toBeInTheDocument();
    expect(component.getByText('Throttle')).toBeInTheDocument();
    expect(
      component.getByText(
        'Context-driven AI tools and workflows for the Agentic Developer.',
      ),
    ).toBeInTheDocument();
    expect(component.getByText('Open source')).toBeInTheDocument();
  });

  describe('Version', () => {
    test('shows the app version injected from package.json', () => {
      const component = renderFooter();

      expect(component.getByTestId('GlobalFooterVersion')).toHaveTextContent(
        `${GLOBAL_FOOTER.versionLabel} ${__APP_VERSION__}`,
      );
    });
  });

  describe('Blog link', () => {
    test('is hidden while the blog switch is off', () => {
      const component = renderFooter();

      expect(
        component.queryByRole('link', { name: 'Blog' }),
      ).not.toBeInTheDocument();
      expect(
        component.queryByRole('navigation', { name: 'Footer' }),
      ).not.toBeInTheDocument();
    });

    test('links to /blog when the blog switch is on', () => {
      isBlogEnabled.mockReturnValue(true);

      const component = renderFooter();

      expect(component.getByRole('link', { name: 'Blog' })).toHaveAttribute(
        'href',
        '/blog',
      );
    });
  });

  test('links to the public sponsors page', () => {
    const { sponsorLink } = GLOBAL_FOOTER;
    const component = renderFooter();
    const link = component.getByRole('link', { name: sponsorLink.label });

    expect(link).toHaveAttribute('href', sponsorLink.href);
    expect(link).toHaveAttribute('target', '_blank');
    expect(
      component.getByText(sponsorLink.prompt, { exact: false }),
    ).toBeInTheDocument();
  });
});
