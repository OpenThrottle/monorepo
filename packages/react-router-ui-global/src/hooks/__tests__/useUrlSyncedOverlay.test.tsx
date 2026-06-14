import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test } from 'vitest';
import { useUrlSyncedOverlay } from '../useUrlSyncedOverlay';

function ClosedHarness(): React.ReactElement {
  const { onOpenChange, open, setOpen } = useUrlSyncedOverlay({
    clearParamsOnClose: ['child'],
    param: 'sheet',
  });
  const [searchParams] = useSearchParams();

  return (
    <div>
      <span data-testid="open">{open ? 'yes' : 'no'}</span>
      <span data-testid="qs">{searchParams.toString()}</span>
      <button
        onClick={() => {
          onOpenChange(true);
        }}
        type="button"
      >
        open via change
      </button>
      <button
        onClick={() => {
          setOpen(false);
        }}
        type="button"
      >
        close via setOpen
      </button>
      <button
        onClick={() => {
          setOpen(true, { entityId: '42' });
        }}
        type="button"
      >
        open with entity
      </button>
    </div>
  );
}

describe('useUrlSyncedOverlay', () => {
  test('reports closed when the param is absent', () => {
    const RoutesStub = createRoutesStub([
      { Component: ClosedHarness, path: '/' },
    ]);

    render(<RoutesStub initialEntries={['/']} />);

    expect(screen.getByTestId('open')).toHaveTextContent('no');
    expect(screen.getByTestId('qs')).toHaveTextContent('');
  });

  test('reports open when param equals the open token', () => {
    const RoutesStub = createRoutesStub([
      { Component: ClosedHarness, path: '/' },
    ]);

    render(<RoutesStub initialEntries={['/?sheet=open']} />);

    expect(screen.getByTestId('open')).toHaveTextContent('yes');
  });

  test('onOpenChange updates the query string', async () => {
    const user = userEvent.setup();
    const RoutesStub = createRoutesStub([
      { Component: ClosedHarness, path: '/' },
    ]);

    render(<RoutesStub initialEntries={['/']} />);

    await user.click(screen.getByRole('button', { name: 'open via change' }));

    expect(screen.getByTestId('open')).toHaveTextContent('yes');
    expect(screen.getByTestId('qs')).toHaveTextContent('sheet=open');
  });

  test('setOpen(false) clears the overlay param and configured child keys', async () => {
    const user = userEvent.setup();
    const RoutesStub = createRoutesStub([
      { Component: ClosedHarness, path: '/' },
    ]);

    render(<RoutesStub initialEntries={['/?sheet=open&child=1&keep=x']} />);

    expect(screen.getByTestId('open')).toHaveTextContent('yes');

    await user.click(screen.getByRole('button', { name: 'close via setOpen' }));

    expect(screen.getByTestId('open')).toHaveTextContent('no');
    const qs = new URLSearchParams(screen.getByTestId('qs').textContent ?? '');
    expect(qs.has('sheet')).toBe(false);
    expect(qs.has('child')).toBe(false);
    expect(qs.get('keep')).toBe('x');
  });

  test('setOpen(true, extra) sets param and extra keys in one update', async () => {
    const user = userEvent.setup();
    const RoutesStub = createRoutesStub([
      { Component: ClosedHarness, path: '/' },
    ]);

    render(<RoutesStub initialEntries={['/']} />);

    await user.click(screen.getByRole('button', { name: 'open with entity' }));

    const qs = new URLSearchParams(screen.getByTestId('qs').textContent ?? '');
    expect(qs.get('sheet')).toBe('open');
    expect(qs.get('entityId')).toBe('42');
  });
});
