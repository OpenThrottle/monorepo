import type { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';
import {
  SidebarProvider,
  TooltipProvider,
} from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  GLOBAL_BACKGROUND_ACTIVITY_COPY,
  GLOBAL_SIDEBAR_FOOTER_COPY,
} from '../../data/data.copy';
import type { GlobalBackgroundActivity } from '../../utils/background-activity';
import { buildAppReleaseHref } from '../../utils/buildAppReleaseHref';
import { GlobalProviders } from '../GlobalProviders';
import type { GlobalSidebarFooterProps } from '../GlobalSidebarFooter';
import { GlobalSidebarFooter } from '../GlobalSidebarFooter';

const FIXED_NOW = Date.parse('2026-11-15T18:30:00.000Z');

/** `collapsed` renders the footer in a sidebar folded to its icon rail. */
const renderSidebarFooter = (
  props: GlobalSidebarFooterProps = {},
  options: { readonly collapsed: boolean } = { collapsed: false },
) => {
  const Component = () => {
    if (options.collapsed) {
      return (
        <SidebarProvider defaultOpen={false}>
          <TooltipProvider>
            <GlobalSidebarFooter {...props} />
          </TooltipProvider>
        </SidebarProvider>
      );
    }

    return (
      <GlobalProviders>
        <GlobalSidebarFooter {...props} />
      </GlobalProviders>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

const codeBackfill: GlobalBackgroundActivity = {
  done: 30,
  etaSeconds: 600,
  id: 'embeddings_backfill:code',
  label: 'Embedding code chunks',
  startedAt: '2026-11-15T18:25:00.000Z',
  status: 'running',
  total: 100,
};

const planBackfill: GlobalBackgroundActivity = {
  done: 20,
  etaSeconds: null,
  id: 'embeddings_backfill:plan',
  label: 'Embedding plans',
  startedAt: '2026-11-15T18:29:00.000Z',
  status: 'running',
  total: 100,
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

  describe('background activity', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(FIXED_NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('shows no bar or ring while the server is idle', () => {
      const component = renderSidebarFooter({ backgroundActivities: [] });

      expect(
        component.queryByTestId('GlobalBackgroundActivityBar'),
      ).not.toBeInTheDocument();
      expect(
        component.queryByTestId('GlobalBackgroundActivityRing'),
      ).not.toBeInTheDocument();
    });

    test('aggregates every activity into one bar linking to the health page', () => {
      const component = renderSidebarFooter({
        backgroundActivities: [codeBackfill, planBackfill],
      });

      const bar = component.getByTestId('GlobalBackgroundActivityBar');

      expect(bar).toHaveAttribute('href', 'http://localhost/api/health');
      expect(bar).toHaveAttribute('target', '_blank');
      expect(component.getAllByRole('progressbar')).toHaveLength(1);
      expect(component.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        '25',
      );
    });

    test('renders an indeterminate bar when a total is unknown', () => {
      const component = renderSidebarFooter({
        backgroundActivities: [{ ...codeBackfill, total: null }],
      });

      const progress = component.getByRole('progressbar');

      expect(progress).not.toHaveAttribute('aria-valuenow');
      expect(progress).toHaveAttribute('data-state', 'indeterminate');
    });

    test('lists each activity with its elapsed time and ETA on hover', async () => {
      const user = userEvent.setup();
      const component = renderSidebarFooter({
        backgroundActivities: [codeBackfill, planBackfill],
      });

      await user.hover(component.getByTestId('GlobalBackgroundActivityBar'));

      const [tooltip] = await component.findAllByTestId(
        'GlobalBackgroundActivityTooltip',
      );

      expect(tooltip).toHaveTextContent(codeBackfill.label);
      expect(tooltip).toHaveTextContent(
        `${GLOBAL_BACKGROUND_ACTIVITY_COPY.started} 5m ${GLOBAL_BACKGROUND_ACTIVITY_COPY.ago}`,
      );
      expect(tooltip).toHaveTextContent(
        `~10m ${GLOBAL_BACKGROUND_ACTIVITY_COPY.left}`,
      );
      expect(tooltip).toHaveTextContent(planBackfill.label);
      expect(tooltip).toHaveTextContent(
        GLOBAL_BACKGROUND_ACTIVITY_COPY.estimating,
      );
    });

    test('draws a ring on the status dot instead of the bar when collapsed', () => {
      const component = renderSidebarFooter(
        { backgroundActivities: [codeBackfill] },
        { collapsed: true },
      );

      expect(
        component.queryByTestId('GlobalBackgroundActivityBar'),
      ).not.toBeInTheDocument();

      const ring = component.getByTestId('GlobalBackgroundActivityRing');

      expect(ring).toHaveAttribute('aria-valuenow', '30');
      expect(ring.querySelector('div.rounded-full')).not.toBeNull();
    });
  });
});
