import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalProviders } from '../GlobalProviders';
import { GlobalSidebarContent } from '../GlobalSidebarContent';
import type { GlobalSidebarContentProps } from '../GlobalSidebarContent';

const StubIcon = (iconProps: { className?: string }) => (
  <span
    className={iconProps.className}
    data-testid="sidebar-content-stub-icon"
  />
);

describe('GlobalSidebarContent Component', () => {
  let component: RenderResult;
  let props: GlobalSidebarContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalSidebarContent {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

describe('GlobalSidebarContent collapsible sections', () => {
  const navigationData: NonNullable<GlobalSidebarContentProps['data']> = {
    Alpha: [{ children: 'Link A', icon: StubIcon, to: '/alpha' }],
    Beta: [{ children: 'Link B', icon: StubIcon, to: '/beta' }],
  };

  test('should toggle section links when section trigger is activated', async () => {
    const user = userEvent.setup();
    const Component = () => (
      <GlobalProviders>
        <GlobalSidebarContent
          data={navigationData}
          defaultSectionsExpanded={false}
        />
      </GlobalProviders>
    );
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      { Component: () => <div>Alpha page</div>, path: '/alpha' },
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
    const Component = () => (
      <GlobalProviders>
        <GlobalSidebarContent data={navigationData} />
      </GlobalProviders>
    );
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      { Component: () => <div>Alpha page</div>, path: '/alpha' },
      { Component: () => <div>Beta page</div>, path: '/beta' },
    ]);
    render(<RoutesStub />);

    expect(screen.getByRole('link', { name: 'Link A' })).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Link A' }));
    expect(await screen.findByText('Alpha page')).toBeInTheDocument();
  });
});
