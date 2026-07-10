import * as React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import {
  SidebarProvider,
  TooltipProvider,
} from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MailToolbar } from '../MailToolbar';
import type { MailToolbarProps } from '../MailToolbar';

const navigateMock = vi.fn();

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => navigateMock };
});

describe('MailToolbar Component', () => {
  let component: RenderResult;
  let props: MailToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <TooltipProvider>
        <SidebarProvider>
          <MailToolbar {...props} />
        </SidebarProvider>
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should have data-testid MailToolbar and role toolbar', () => {
    const toolbar = component.getByTestId('MailToolbar');
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveAttribute('role', 'toolbar');
  });

  test('should render search section with labeled input', () => {
    const search = component.getByRole('search');
    expect(search).toBeInTheDocument();
    const input = component.getByRole('searchbox', { name: /search mail/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search mail');
  });

  test('should render breadcrumb navigation with Mail and Inbox', () => {
    const toolbar = component.getByTestId('MailToolbar');
    const navs = component.getAllByRole('navigation', { name: /breadcrumb/i });
    expect(navs.length).toBeGreaterThanOrEqual(1);
    expect(navs[0]).toContainElement(
      component.getByRole('link', { name: /^mail$/i }),
    );
    expect(toolbar).toHaveTextContent('Inbox');
  });

  test('should render Compose link to /mail/compose', () => {
    const compose = component.getByRole('link', { name: /compose/i });
    expect(compose).toBeInTheDocument();
    expect(compose).toHaveAttribute('href', '/mail/compose');
  });

  test('should render action buttons with accessible labels', () => {
    expect(
      component.getByRole('button', { name: /refresh/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /archive/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /delete/i }),
    ).toBeInTheDocument();
  });

  test('should render sidebar trigger for collapsible navigation', () => {
    const trigger = component.getByTestId('MailToolbar-sidebarTrigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-label', 'Toggle sidebar');
  });
});

// Driven with `fireEvent.change` rather than `userEvent`: under fake timers
// `userEvent`'s internal scheduling deadlocks, and repo precedent
// (packages/react-router-ide WorkspaceFilePalette.test, useDebouncedValue.test)
// exercises the debounce timer directly the same way.
describe('MailToolbar search debounce', () => {
  const renderOnSearchPage = (): RenderResult => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <TooltipProvider>
        <SidebarProvider>
          <MailToolbar />
        </SidebarProvider>
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/mail/search' }]);

    return render(<RoutesStub initialEntries={['/mail/search']} />);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    navigateMock.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  test('debounces navigation to the search route while typing', () => {
    const component = renderOnSearchPage();
    const input = component.getByRole('searchbox', { name: /search mail/i });

    act(() => {
      fireEvent.change(input, { target: { value: 'hel' } });
      fireEvent.change(input, { target: { value: 'hello' } });
    });

    // Nothing fires before the debounce window elapses.
    expect(navigateMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Only the final value navigates (debounced, not once per keystroke).
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/mail/search?q=hello', {
      replace: true,
      viewTransition: true,
    });
  });

  test('encodes the query and trims whitespace', () => {
    const component = renderOnSearchPage();
    const input = component.getByRole('searchbox', { name: /search mail/i });

    act(() => {
      fireEvent.change(input, { target: { value: '  a&b c  ' } });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(navigateMock).toHaveBeenCalledWith(
      `/mail/search?q=${encodeURIComponent('a&b c')}`,
      { replace: true, viewTransition: true },
    );
  });

  test('navigates to the bare search route when the query is empty', () => {
    const component = renderOnSearchPage();
    const input = component.getByRole('searchbox', { name: /search mail/i });

    act(() => {
      fireEvent.change(input, { target: { value: '   ' } });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(navigateMock).toHaveBeenCalledWith('/mail/search', {
      replace: true,
      viewTransition: true,
    });
  });
});
