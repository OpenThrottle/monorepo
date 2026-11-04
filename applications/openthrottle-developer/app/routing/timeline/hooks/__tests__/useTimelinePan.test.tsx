import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
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
  test('pans right on ArrowRight', async () => {
    const user = userEvent.setup();
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');
    pane.scrollLeft = 0;
    pane.focus();

    await user.keyboard('{ArrowRight}');

    expect(pane.scrollLeft).toBe(50);
  });

  test('pans left on ArrowLeft', async () => {
    const user = userEvent.setup();
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');
    pane.scrollLeft = 100;
    pane.focus();

    await user.keyboard('{ArrowLeft}');

    expect(pane.scrollLeft).toBe(50);
  });

  test('jumps to the window start on Home', async () => {
    const user = userEvent.setup();
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');
    pane.scrollLeft = 300;
    pane.focus();

    await user.keyboard('{Home}');

    expect(pane.scrollLeft).toBe(0);
  });

  test('ignores keys it does not own, so the page keeps its own scrolling', async () => {
    const user = userEvent.setup();
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');
    pane.scrollLeft = 40;
    pane.focus();

    await user.keyboard('{PageDown}');

    expect(pane.scrollLeft).toBe(40);
  });

  test('drags the body by the pointer delta', async () => {
    const user = userEvent.setup();
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');
    pane.scrollLeft = 100;

    await user.pointer([
      { coords: { clientX: 200 }, keys: '[MouseLeft>]', target: pane },
      { coords: { clientX: 150 }, target: pane },
    ]);

    expect(pane.scrollLeft).toBe(150);
  });

  test('ignores a non-primary button so context menus still work', async () => {
    const user = userEvent.setup();
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');
    pane.scrollLeft = 100;

    await user.pointer([
      { coords: { clientX: 200 }, keys: '[MouseRight>]', target: pane },
      { coords: { clientX: 150 }, target: pane },
    ]);

    expect(pane.scrollLeft).toBe(100);
  });

  test('stops panning on pointer up', async () => {
    const user = userEvent.setup();
    const view = render(<Probe />);
    const pane = view.getByTestId('pane');

    await user.pointer({
      coords: { clientX: 200 },
      keys: '[MouseLeft>]',
      target: pane,
    });
    expect(pane).toHaveAttribute('data-panning', 'true');

    await user.pointer({ keys: '[/MouseLeft]', target: pane });
    expect(pane).toHaveAttribute('data-panning', 'false');
  });
});
