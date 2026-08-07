import { act, render } from '@testing-library/react';
import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { useSelectionKeyboard } from '../useSelectionKeyboard';

type Call =
  ['delete'] | ['deselect'] | ['nudge', number, number] | ['rotate', number];

interface HarnessProps {
  readonly calls: Call[];
  readonly enabled?: boolean;
}

function Harness(props: HarnessProps): ReactElement {
  useSelectionKeyboard({
    enabled: props.enabled ?? true,
    gridSize: 12,
    onDelete: () => props.calls.push(['delete']),
    onDeselect: () => props.calls.push(['deselect']),
    onNudge: (dx, dy) => props.calls.push(['nudge', dx, dy]),
    onRotate: (delta) => props.calls.push(['rotate', delta]),
  });
  return <input data-testid="field" />;
}

function press(key: string, init: KeyboardEventInit = {}): void {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }));
  });
}

describe('useSelectionKeyboard', () => {
  it('nudges by one grid step, larger with Shift', () => {
    const calls: Call[] = [];
    render(<Harness calls={calls} />);
    press('ArrowRight');
    press('ArrowUp', { shiftKey: true });
    expect(calls).toContainEqual(['nudge', 12, 0]);
    expect(calls).toContainEqual(['nudge', 0, -48]);
  });

  it('deletes, rotates, and deselects', () => {
    const calls: Call[] = [];
    render(<Harness calls={calls} />);
    press('Delete');
    press(']');
    press('[');
    press('Escape');
    expect(calls).toContainEqual(['delete']);
    expect(calls).toContainEqual(['rotate', 15]);
    expect(calls).toContainEqual(['rotate', -15]);
    expect(calls).toContainEqual(['deselect']);
  });

  it('ignores nudges while typing in a field but still allows Escape', () => {
    const calls: Call[] = [];
    const component = render(<Harness calls={calls} />);
    const field = component.getByTestId('field');
    act(() => {
      field.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
      );
      field.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
      );
    });
    expect(calls.some((call) => call[0] === 'nudge')).toBe(false);
    expect(calls).toContainEqual(['deselect']);
  });

  it('does nothing when disabled', () => {
    const calls: Call[] = [];
    render(<Harness calls={calls} enabled={false} />);
    press('Delete');
    expect(calls).toHaveLength(0);
  });
});
