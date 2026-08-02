import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Link,
  Outlet,
  createRoutesStub,
  useNavigate,
  useSearchParams,
} from 'react-router';
import { describe, expect, test } from 'vitest';
import { useScrollContainerRestoration } from '../useScrollContainerRestoration';

function ScrollLayout(): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useScrollContainerRestoration(containerRef);

  return (
    <div
      data-testid="scroll-container"
      ref={containerRef}
      style={{ height: 120, overflow: 'auto' }}
    >
      <Outlet />
    </div>
  );
}

// eslint-disable-next-line react/no-multi-comp -- test-local mock component
function PageA(): React.ReactElement {
  return (
    <div>
      <div data-testid="page-a" style={{ height: 2000 }}>
        Page A
      </div>
      <Link to="/b">Go to B</Link>
    </div>
  );
}

// eslint-disable-next-line react/no-multi-comp -- test-local mock component
function PageB(): React.ReactElement {
  const navigate = useNavigate();

  return (
    <div>
      <div data-testid="page-b" style={{ height: 2000 }}>
        Page B
      </div>
      <button
        onClick={() => {
          navigate(-1);
        }}
        type="button"
      >
        Go back
      </button>
    </div>
  );
}

// eslint-disable-next-line react/no-multi-comp -- test-local mock component
function PageTabs(): React.ReactElement {
  const [searchParams] = useSearchParams();

  return (
    <div>
      <div data-testid="page-tabs" style={{ height: 2000 }}>
        Tab: {searchParams.get('tab') ?? 'one'}
      </div>
      {/* setSearchParams-style navigation: same pathname, different search. */}
      <Link to="/tabs?tab=two">Go to tab two</Link>
    </div>
  );
}

describe('useScrollContainerRestoration', () => {
  test('resets scroll on push and restores scroll on pop', async () => {
    const user = userEvent.setup();
    const RoutesStub = createRoutesStub([
      {
        Component: ScrollLayout,
        children: [
          { Component: PageA, path: 'a' },
          { Component: PageB, path: 'b' },
        ],
        path: '/',
      },
    ]);

    render(<RoutesStub initialEntries={['/a']} />);

    const container = screen.getByTestId('scroll-container');
    container.scrollTop = 480;
    expect(container.scrollTop).toBe(480);

    await user.click(screen.getByRole('link', { name: 'Go to B' }));

    await waitFor(() => {
      expect(screen.getByTestId('page-b')).toBeInTheDocument();
    });
    expect(container.scrollTop).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Go back' }));

    await waitFor(() => {
      expect(screen.getByTestId('page-a')).toBeInTheDocument();
    });
    expect(container.scrollTop).toBe(480);
  });

  test('preserves scroll on a same-route search-param push (URL-synced tabs)', async () => {
    const user = userEvent.setup();
    const RoutesStub = createRoutesStub([
      {
        Component: ScrollLayout,
        children: [{ Component: PageTabs, path: 'tabs' }],
        path: '/',
      },
    ]);

    render(<RoutesStub initialEntries={['/tabs']} />);

    const container = screen.getByTestId('scroll-container');
    container.scrollTop = 480;
    expect(container.scrollTop).toBe(480);

    await user.click(screen.getByRole('link', { name: 'Go to tab two' }));

    // The search param changed (a push on the same pathname), so the tab
    // switched but the scroll position must be left untouched.
    await waitFor(() => {
      expect(screen.getByTestId('page-tabs')).toHaveTextContent('Tab: two');
    });
    expect(container.scrollTop).toBe(480);
  });
});
