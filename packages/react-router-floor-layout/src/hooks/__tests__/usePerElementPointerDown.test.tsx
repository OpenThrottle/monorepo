import { act, render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type PointerEvent as ReactPointerEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { usePerElementPointerDown } from '../usePerElementPointerDown';

describe('usePerElementPointerDown', () => {
  it('returns a getPointerDown function', () => {
    const { result } = renderHook(() =>
      usePerElementPointerDown({ handler: vi.fn() }),
    );

    expect(typeof result.current.getPointerDown).toBe('function');
  });

  it('returns a referentially stable closure for the same id across renders', () => {
    const { rerender, result } = renderHook(
      (props: { handler: (id: string, event: ReactPointerEvent) => void }) =>
        usePerElementPointerDown(props),
      { initialProps: { handler: vi.fn() } },
    );

    const first = result.current.getPointerDown('a');
    rerender({ handler: vi.fn() });
    const second = result.current.getPointerDown('a');

    expect(first).toBe(second);
  });

  it('returns distinct closures per id', () => {
    const { result } = renderHook(() =>
      usePerElementPointerDown({ handler: vi.fn() }),
    );

    const forA = result.current.getPointerDown('a');
    const forB = result.current.getPointerDown('b');

    expect(forA).not.toBe(forB);
  });

  it('dispatches to the latest handler with the element id when invoked via a DOM pointerdown', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const handler = (id: string): void => {
      calls.push(id);
    };

    const { result } = renderHook(() => usePerElementPointerDown({ handler }));
    const pointerDown = result.current.getPointerDown('elem-1');

    const component = render(
      <div data-testid="target" onPointerDown={pointerDown} />,
    );

    await user.pointer({
      keys: '[MouseLeft>]',
      target: component.getByTestId('target'),
    });

    expect(calls).toEqual(['elem-1']);
  });

  it('always dispatches through the latest handler even though the closure is cached', async () => {
    const user = userEvent.setup();
    const first = vi.fn();
    const second = vi.fn();

    const { rerender, result } = renderHook(
      (props: { handler: (id: string, event: ReactPointerEvent) => void }) =>
        usePerElementPointerDown(props),
      { initialProps: { handler: first } },
    );

    const pointerDown = result.current.getPointerDown('elem-1');
    const component = render(
      <div data-testid="target" onPointerDown={pointerDown} />,
    );

    rerender({ handler: second });
    act(() => {
      // No-op: ensure the ref update flushed.
    });

    await user.pointer({
      keys: '[MouseLeft>]',
      target: component.getByTestId('target'),
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('elem-1', expect.anything());
  });
});
