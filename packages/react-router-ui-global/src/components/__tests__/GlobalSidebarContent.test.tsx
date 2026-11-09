import { Sidebar, SidebarTrigger } from '@openthrottle/react-router-shadcn';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';

import { GlobalProviders } from '../GlobalProviders';
import type { GlobalSidebarContentProps } from '../GlobalSidebarContent';
import { GlobalSidebarContent } from '../GlobalSidebarContent';

const StubIcon = (iconProps: { className?: string }) => {
  return (
    <span
      className={iconProps.className}
      data-testid="sidebar-content-stub-icon"
    />
  );
};

describe('GlobalSidebarContent Component', () => {
  test('renders empty sidebar when no navigation data is provided', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <GlobalProviders>
          <GlobalSidebarContent />
        </GlobalProviders>
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('GlobalSidebarContent collapsible sections', () => {
  const navigationData: NonNullable<GlobalSidebarContentProps['data']> = {
    Alpha: [{ children: 'Link A', icon: StubIcon, to: '/alpha' }],
    Beta: [{ children: 'Link B', icon: StubIcon, to: '/beta' }],
  };

  test('should toggle section links when section trigger is activated', async () => {
    const user = userEvent.setup();
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <GlobalProviders>
          <GlobalSidebarContent
            data={navigationData}
            defaultSectionsExpanded={false}
          />
        </GlobalProviders>
      );
    };
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      // eslint-disable-next-line react/no-multi-comp -- test-local mock component
      { Component: () => <div>Alpha page</div>, path: '/alpha' },
      // eslint-disable-next-line react/no-multi-comp -- test-local mock component
      { Component: () => <div>Beta page</div>, path: '/beta' },
    ]);
    render(<RoutesStub />);

    await waitFor(() => {
      expect(
        screen.queryByRole('link', { name: 'Link A' }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole('link', { name: 'Link B' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Alpha' }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Link A' })).toBeVisible();
    });
    expect(
      screen.queryByRole('link', { name: 'Link B' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Alpha' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('link', { name: 'Link A' }),
      ).not.toBeInTheDocument();
    });
  });

  test('should navigate when a section link is activated while expanded', async () => {
    const user = userEvent.setup();
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <GlobalProviders>
          <GlobalSidebarContent data={navigationData} />
        </GlobalProviders>
      );
    };
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      // eslint-disable-next-line react/no-multi-comp -- test-local mock component
      { Component: () => <div>Alpha page</div>, path: '/alpha' },
      // eslint-disable-next-line react/no-multi-comp -- test-local mock component
      { Component: () => <div>Beta page</div>, path: '/beta' },
    ]);
    render(<RoutesStub />);

    expect(screen.getByRole('link', { name: 'Link A' })).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Link A' }));
    expect(await screen.findByText('Alpha page')).toBeInTheDocument();
  });
});

describe('GlobalSidebarContent on phones', () => {
  const desktopWidth = window.innerWidth;

  afterEach(() => {
    window.innerWidth = desktopWidth;
  });

  test('closes the sidebar sheet after a link is tapped', async () => {
    window.innerWidth = 375;
    const user = userEvent.setup();
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <GlobalProviders>
          <SidebarTrigger />
          <Sidebar>
            <GlobalSidebarContent
              data={{
                Alpha: [{ children: 'Link A', icon: StubIcon, to: '/' }],
              }}
            />
          </Sidebar>
        </GlobalProviders>
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Link A' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

describe('GlobalSidebarContent prefetch and pending navigation', () => {
  test('prefetches an item that opts in, once it is hovered', async () => {
    const user = userEvent.setup();
    const navigationData: NonNullable<GlobalSidebarContentProps['data']> = {
      Settings: [
        {
          children: 'Repositories',
          icon: StubIcon,
          prefetch: 'intent',
          to: '/target',
        },
      ],
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <GlobalProviders>
          <GlobalSidebarContent data={navigationData} />
        </GlobalProviders>
      );
    };
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      {
        Component: () => null,
        loader: () => {
          return null;
        },
        path: '/target',
      },
    ]);
    render(<RoutesStub />);

    expect(document.querySelector('link[rel="prefetch"]')).toBeNull();

    await user.hover(screen.getByRole('link', { name: 'Repositories' }));

    await waitFor(() => {
      expect(
        document.querySelector('link[rel="prefetch"][href="/target.data"]'),
      ).not.toBeNull();
    });
  });

  test('marks a link as pending while its route is still loading', async () => {
    const user = userEvent.setup();
    const navigationData: NonNullable<GlobalSidebarContentProps['data']> = {
      Settings: [
        {
          children: 'Repositories',
          icon: StubIcon,
          prefetch: 'intent',
          to: '/slow',
        },
      ],
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <GlobalProviders>
          <GlobalSidebarContent data={navigationData} />
        </GlobalProviders>
      );
    };
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      {
        Component: () => null,
        // Never settles, so the navigation stays pending for the assertion.
        loader: () => {
          return new Promise<never>(() => undefined);
        },
        path: '/slow',
      },
    ]);
    render(<RoutesStub />);

    const link = screen.getByRole('link', { name: 'Repositories' });
    expect(link).not.toHaveClass('pending');

    await user.click(link);

    // NavLink appends `pending`; the link's `[&.pending]:animate-pulse` styles it. The className
    // must stay a string: SidebarMenuButton's Slot merges classNames as strings, so a NavLink
    // className function would be stringified rather than called.
    await waitFor(() => {
      expect(link).toHaveClass('pending');
    });
    expect(link.className).toContain('[&.pending]:animate-pulse');
  });
});
