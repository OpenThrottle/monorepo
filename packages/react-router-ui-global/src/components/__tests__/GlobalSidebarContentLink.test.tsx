import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { GlobalProviders } from '../GlobalProviders';
import type { GlobalSidebarContentLinkProps as LinkProps } from '../GlobalSidebarContent';
import type { GlobalSidebarContentLinkProps } from '../GlobalSidebarContentLink';
import { GlobalSidebarContentLink } from '../GlobalSidebarContentLink';

const StubIcon = (iconProps: { className?: string }) => {
  return <span className={iconProps.className} />;
};

const parent: LinkProps = {
  children: 'Usage',
  icon: StubIcon,
  subLinks: [
    { children: 'Overview', end: true, icon: StubIcon, to: '/usage' },
    { children: 'Skills', icon: StubIcon, to: '/usage/skills' },
    { beta: true, children: 'Hidden Beta', icon: StubIcon, to: '/usage/beta' },
  ],
  to: '/usage',
};

const renderAt = (
  pathname: string,
  overrides: Partial<GlobalSidebarContentLinkProps> = {},
) => {
  const props: GlobalSidebarContentLinkProps = {
    activeItemRef: { current: null },
    isBetaEnabled: false,
    isCharlieEnabled: false,
    item: parent,
    onNavigate: vi.fn(),
    pathname,
    ...overrides,
  };
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = () => {
    return (
      <GlobalProviders>
        <ul>
          <GlobalSidebarContentLink {...props} />
        </ul>
      </GlobalProviders>
    );
  };
  const router = createMemoryRouter([{ Component, path: '*' }], {
    initialEntries: [pathname],
  });

  return { component: render(<RouterProvider router={router} />), props };
};

describe('GlobalSidebarContentLink Component', () => {
  test('shows sub-links while the parent route is active', () => {
    const { component } = renderAt('/usage/skills');

    expect(component.getByRole('link', { name: 'Skills' })).toHaveAttribute(
      'href',
      '/usage/skills',
    );
    expect(component.getByRole('link', { name: 'Overview' })).toBeVisible();
  });

  test('hides sub-links when the parent route is not active', () => {
    const { component } = renderAt('/plans');

    expect(component.getByRole('link', { name: 'Usage' })).toBeVisible();
    expect(
      component.queryByRole('link', { name: 'Skills' }),
    ).not.toBeInTheDocument();
  });

  test('does not mark an end sub-link active on a child path', () => {
    const { component } = renderAt('/usage/skills');

    expect(
      component.getByRole('link', { name: 'Overview' }),
    ).not.toHaveAttribute('aria-current');
    expect(component.getByRole('link', { name: 'Skills' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('marks the end sub-link active on its own path', () => {
    const { component } = renderAt('/usage');

    expect(component.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('omits beta sub-links unless beta is enabled', () => {
    const off = renderAt('/usage');

    expect(
      off.component.queryByRole('link', { name: /Hidden Beta/ }),
    ).not.toBeInTheDocument();
    off.component.unmount();

    const on = renderAt('/usage', { isBetaEnabled: true });

    expect(
      on.component.getByRole('link', { name: /Hidden Beta/ }),
    ).toBeVisible();
  });

  test('calls onNavigate when a sub-link is clicked', async () => {
    const user = userEvent.setup();
    const { component, props } = renderAt('/usage');

    await user.click(component.getByRole('link', { name: 'Skills' }));

    expect(props.onNavigate).toHaveBeenCalledTimes(1);
  });

  test('attaches the active ref to the active sub-item, not the parent', () => {
    const activeItemRef: React.RefObject<HTMLLIElement | null> = {
      current: null,
    };
    const { component } = renderAt('/usage/skills', { activeItemRef });

    expect(activeItemRef.current).toBe(
      component.getByRole('link', { name: 'Skills' }).closest('li'),
    );
  });

  test('attaches the active ref to the parent when no sub-link is active', () => {
    const activeItemRef: React.RefObject<HTMLLIElement | null> = {
      current: null,
    };
    const { component } = renderAt('/usage/other', { activeItemRef });

    expect(activeItemRef.current).toBe(
      component.getByRole('link', { name: 'Usage' }).closest('li'),
    );
  });
});
