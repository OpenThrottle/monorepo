import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test } from 'vitest';

import { ROUTE_STATS_URL } from '../../data/data.route-stats';
import { useRouteStatsToggle } from '../useRouteStatsToggle';

function Harness(): React.ReactElement {
  const { contentId, isOpen, setOpen, toggle } = useRouteStatsToggle();
  const [searchParams] = useSearchParams();

  return (
    <div>
      <span data-testid="open">{isOpen ? 'yes' : 'no'}</span>
      <span data-testid="qs">{searchParams.toString()}</span>
      <span data-testid="content-id">{contentId}</span>
      <button onClick={toggle} type="button">
        toggle
      </button>
      <button
        onClick={() => {
          setOpen(false);
        }}
        type="button"
      >
        close
      </button>
    </div>
  );
}

const renderAt = (entry: string): ReturnType<typeof render> => {
  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub initialEntries={[entry]} />);
};

describe('useRouteStatsToggle', () => {
  describe('when the stats param is absent', () => {
    test('reports closed', () => {
      const component = renderAt('/');

      expect(component.getByTestId('open')).toHaveTextContent('no');
    });
  });

  describe('when the stats param is open', () => {
    test('reports open on load', () => {
      const component = renderAt('/?stats=open');

      expect(component.getByTestId('open')).toHaveTextContent('yes');
    });
  });

  describe('when the stats param has another value', () => {
    test('reports closed', () => {
      const component = renderAt('/?stats=1');

      expect(component.getByTestId('open')).toHaveTextContent('no');
    });
  });

  test('toggle opens then closes, preserving every other param', async () => {
    const user = userEvent.setup();
    const component = renderAt('/?status=QUEUED&search=foo&page=2');

    await user.click(component.getByRole('button', { name: 'toggle' }));

    const opened = new URLSearchParams(
      component.getByTestId('qs').textContent ?? '',
    );
    expect(component.getByTestId('open')).toHaveTextContent('yes');
    expect(opened.get('stats')).toBe('open');
    expect(opened.get('status')).toBe('QUEUED');
    expect(opened.get('search')).toBe('foo');
    expect(opened.get('page')).toBe('2');

    await user.click(component.getByRole('button', { name: 'toggle' }));

    const closed = new URLSearchParams(
      component.getByTestId('qs').textContent ?? '',
    );
    expect(component.getByTestId('open')).toHaveTextContent('no');
    expect(closed.has('stats')).toBe(false);
    expect(closed.get('status')).toBe('QUEUED');
    expect(closed.get('search')).toBe('foo');
    expect(closed.get('page')).toBe('2');
  });

  test('setOpen to the current state leaves the URL alone', async () => {
    const user = userEvent.setup();
    const component = renderAt('/?keep=x');

    await user.click(component.getByRole('button', { name: 'close' }));

    expect(component.getByTestId('qs')).toHaveTextContent('keep=x');
  });

  test('exposes the shared panel id', () => {
    const component = renderAt('/');

    expect(component.getByTestId('content-id')).toHaveTextContent(
      ROUTE_STATS_URL.contentId,
    );
  });
});
