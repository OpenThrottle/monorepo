import type { RenderResult } from '@testing-library/react';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, Link, Outlet, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { GlobalRouteViewTransition } from '../GlobalRouteViewTransition';

describe('GlobalRouteViewTransition Component', () => {
  let component: RenderResult;
  let startViewTransition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // jsdom has no View Transitions API. Record the call and throw: React
    // catches the throw and commits the update without animating.
    startViewTransition = vi.fn(() => {
      throw new Error('view transitions are not supported in jsdom');
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    });

    const Layout = () => {
      return (
        <GlobalRouteViewTransition>
          <Outlet />
        </GlobalRouteViewTransition>
      );
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local page route
    const Page = () => {
      const location = useLocation();

      return (
        <div>
          <p data-testid="location">{`${location.pathname}${location.search}`}</p>
          <Link to="/?stats=open">Search only</Link>
          <Link to="/other">Other route</Link>
        </div>
      );
    };
    const RoutesStub = createRoutesStub([
      {
        Component: Layout,
        children: [
          { Component: Page, path: '/' },
          { Component: Page, path: '/other' },
        ],
      },
    ]);

    component = render(<RoutesStub />);
  });

  afterEach(() => {
    Reflect.deleteProperty(document, 'startViewTransition');
    Reflect.deleteProperty(document, 'visibilityState');
  });

  test('renders its children', () => {
    expect(component.getByTestId('location')).toHaveTextContent('/');
  });

  describe('when only the search params change', () => {
    test('does not start a view transition', async () => {
      await userEvent.click(
        component.getByRole('link', { name: 'Search only' }),
      );

      await waitFor(() => {
        expect(component.getByTestId('location')).toHaveTextContent(
          '/?stats=open',
        );
      });
      expect(startViewTransition).not.toHaveBeenCalled();
    });
  });

  describe('when the pathname changes', () => {
    test('starts a view transition', async () => {
      await userEvent.click(
        component.getByRole('link', { name: 'Other route' }),
      );

      await waitFor(() => {
        expect(component.getByTestId('location')).toHaveTextContent('/other');
      });
      expect(startViewTransition).toHaveBeenCalled();
    });
  });

  describe('when the pathname changes while the document is hidden', () => {
    test('does not start a view transition', async () => {
      act(() => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await userEvent.click(
        component.getByRole('link', { name: 'Other route' }),
      );

      await waitFor(() => {
        expect(component.getByTestId('location')).toHaveTextContent('/other');
      });
      expect(startViewTransition).not.toHaveBeenCalled();
    });
  });
});
