import * as React from 'react';
import { render } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useTimelinePan } from '../useTimelinePan';

const Probe = (): React.ReactElement => {
  const pan = useTimelinePan({ keyStep: 50 });

  return (
    <div
      data-panning={pan.isPanning}
      data-testid="pane"
      onKeyDown={pan.onKeyDown}
      onPointerDown={pan.onPointerDown}
      onPointerMove={pan.onPointerMove}
      onPointerUp={pan.onPointerUp}
      ref={pan.ref}
      tabIndex={0}
    />
  );
};

describe('useTimelinePan', () => {
  test('pans right on ArrowRight', () => {
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');
    pane.scrollLeft = 0;

    fireEvent.keyDown(pane, { key: 'ArrowRight' });

    expect(pane.scrollLeft).toBe(50);
  });

  test('pans left on ArrowLeft', () => {
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');
    pane.scrollLeft = 100;

    fireEvent.keyDown(pane, { key: 'ArrowLeft' });

    expect(pane.scrollLeft).toBe(50);
  });

  test('jumps to the window start on Home', () => {
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');
    pane.scrollLeft = 300;

    fireEvent.keyDown(pane, { key: 'Home' });

    expect(pane.scrollLeft).toBe(0);
  });

  test('ignores keys it does not own, so the page keeps its own scrolling', () => {
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');
    pane.scrollLeft = 40;

    fireEvent.keyDown(pane, { key: 'PageDown' });

    expect(pane.scrollLeft).toBe(40);
  });

  test('drags the body by the pointer delta', () => {
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');
    pane.scrollLeft = 100;

    fireEvent.pointerDown(pane, { button: 0, clientX: 200 });
    fireEvent.pointerMove(pane, { clientX: 150 });

    expect(pane.scrollLeft).toBe(150);
  });

  test('ignores a non-primary button so context menus still work', () => {
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');
    pane.scrollLeft = 100;

    fireEvent.pointerDown(pane, { button: 2, clientX: 200 });
    fireEvent.pointerMove(pane, { clientX: 150 });

    expect(pane.scrollLeft).toBe(100);
  });

  test('stops panning on pointer up', () => {
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');

    fireEvent.pointerDown(pane, { button: 0, clientX: 200 });
    expect(pane).toHaveAttribute('data-panning', 'true');

    fireEvent.pointerUp(pane);
    expect(pane).toHaveAttribute('data-panning', 'false');
  });
});
