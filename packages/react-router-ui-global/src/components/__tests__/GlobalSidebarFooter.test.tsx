import type { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { GLOBAL_SIDEBAR_FOOTER_COPY } from '../../data/data.copy';
import { buildAppReleaseHref } from '../../utils/buildAppReleaseHref';
import { GlobalProviders } from '../GlobalProviders';
import type { GlobalSidebarFooterProps } from '../GlobalSidebarFooter';
import { GlobalSidebarFooter } from '../GlobalSidebarFooter';

const renderSidebarFooter = (props: GlobalSidebarFooterProps = {}) => {
  const Component = () => {
    return (
      <GlobalProviders>
        <GlobalSidebarFooter {...props} />
      </GlobalProviders>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

/**
 * @description The overall-status dot is a className-only `<div>` (no text/role)
 * rendered as the first child of the System Status link. Grab it via the link's
 * accessible name, then assert its Tailwind color class.
 */
const getStatusDot = (component: RenderResult): Element => {
  const link = component.getByRole('link', {
    name: GLOBAL_SIDEBAR_FOOTER_COPY.systemStatus,
  });
  const dot = link.querySelector('div.rounded-full');
  if (dot == null) {
    throw new Error('Expected a status dot inside the System Status link');
  }
  return dot;
};

const okHealth: ServerHealthObject = {
  api: 'ok',
  database: 'ok',
  redis: 'ok',
  websocket: 'ok',
};

describe('GlobalSidebarFooter Component', () => {
  test('renders the system status link to the health endpoint in a new tab', () => {
    const component = renderSidebarFooter();

    const link = component.getByRole('link', {
      name: GLOBAL_SIDEBAR_FOOTER_COPY.systemStatus,
    });
    expect(link).toHaveAttribute('href', 'http://localhost/api/health');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  describe('when an app version is supplied', () => {
    test('renders the version badge as a link to its release', () => {
      const component = renderSidebarFooter({ appVersion: '3.2.1' });

      const badge = component.getByRole('link', {
        name: `${GLOBAL_SIDEBAR_FOOTER_COPY.versionLinkLabel} 3.2.1`,
      });
      expect(badge).toHaveAttribute(
        'href',
        buildAppReleaseHref('test-app', '3.2.1'),
      );
      expect(badge).toHaveAttribute('target', '_blank');
      expect(badge).toHaveAttribute('rel', 'noopener noreferrer');
      expect(badge).toHaveAttribute('data-slot', 'badge');
      expect(badge).toHaveTextContent(
        `${GLOBAL_SIDEBAR_FOOTER_COPY.versionPrefix}3.2.1`,
      );
    });
  });

  describe('when no app version is supplied', () => {
    test('renders no version badge', () => {
      const component = renderSidebarFooter();

      expect(
        component.queryByTestId('GlobalSidebarFooterVersion'),
      ).not.toBeInTheDocument();
      expect(component.getAllByRole('link')).toHaveLength(1);
    });
  });

  test('shows the green dot only when every component is ok', () => {
    const component = renderSidebarFooter({ health: okHealth });

    expect(getStatusDot(component)).toHaveClass('bg-green-500');
  });

  test('renders amber (not green) when no health payload is present', () => {
    const component = renderSidebarFooter();

    const dot = getStatusDot(component);
    expect(dot).toHaveClass('bg-amber-500');
    expect(dot).not.toHaveClass('bg-green-500');
  });

  test('does NOT render the green dot when redis is unreachable', () => {
    const component = renderSidebarFooter({
      health: { ...okHealth, redis: 'unreachable' },
    });

    const dot = getStatusDot(component);
    expect(dot).toHaveClass('bg-red-500');
    expect(dot).not.toHaveClass('bg-green-500');
  });

  test('does NOT render the green dot when the websocket is unreachable (websocket folds into overall status)', () => {
    const component = renderSidebarFooter({
      health: { ...okHealth, websocket: 'unreachable' },
    });

    const dot = getStatusDot(component);
    expect(dot).toHaveClass('bg-red-500');
    expect(dot).not.toHaveClass('bg-green-500');
  });

  test('renders amber (not green) when a component is unconfigured', () => {
    const component = renderSidebarFooter({
      health: { ...okHealth, redis: 'unconfigured' },
    });

    const dot = getStatusDot(component);
    expect(dot).toHaveClass('bg-amber-500');
    expect(dot).not.toHaveClass('bg-green-500');
  });
});
