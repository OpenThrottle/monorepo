import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';
import type { GlobalSidebarFooterProps } from '../GlobalSidebarFooter';
import { GlobalProviders } from '../GlobalProviders';
import { GlobalSidebarFooter } from '../GlobalSidebarFooter';

const renderSidebarFooter = (props: GlobalSidebarFooterProps = {}): void => {
  const Component = () => (
    <GlobalProviders>
      <GlobalSidebarFooter {...props} />
    </GlobalProviders>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  render(<RoutesStub />);
};

/**
 * @description The overall-status dot is a className-only `<div>` (no text/role)
 * rendered as the first child of the System Status link. Grab it via the link's
 * accessible name, then assert its Tailwind color class.
 */
const getStatusDot = (): Element => {
  const link = screen.getByRole('link', { name: /System Status/i });
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
  test('renders system status link', () => {
    renderSidebarFooter();

    expect(
      screen.getByRole('link', { name: /System Status/i }),
    ).toHaveAttribute('href', expect.stringContaining('/health'));
  });

  test('shows the green dot only when every component is ok', () => {
    renderSidebarFooter({ health: okHealth });

    expect(getStatusDot()).toHaveClass('bg-green-500');
  });

  test('renders amber (not green) when no health payload is present', () => {
    renderSidebarFooter();

    const dot = getStatusDot();
    expect(dot).toHaveClass('bg-amber-500');
    expect(dot).not.toHaveClass('bg-green-500');
  });

  test('does NOT render the green dot when redis is unreachable', () => {
    renderSidebarFooter({ health: { ...okHealth, redis: 'unreachable' } });

    const dot = getStatusDot();
    expect(dot).toHaveClass('bg-red-500');
    expect(dot).not.toHaveClass('bg-green-500');
  });

  test('does NOT render the green dot when the websocket is unreachable (websocket folds into overall status)', () => {
    renderSidebarFooter({ health: { ...okHealth, websocket: 'unreachable' } });

    const dot = getStatusDot();
    expect(dot).toHaveClass('bg-red-500');
    expect(dot).not.toHaveClass('bg-green-500');
  });

  test('renders amber (not green) when a component is unconfigured', () => {
    renderSidebarFooter({ health: { ...okHealth, redis: 'unconfigured' } });

    const dot = getStatusDot();
    expect(dot).toHaveClass('bg-amber-500');
    expect(dot).not.toHaveClass('bg-green-500');
  });
});
