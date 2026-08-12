import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FloorToolbar, type FloorToolbarProps } from '../FloorToolbar';

function baseProps(
  overrides: Partial<FloorToolbarProps> = {},
): FloorToolbarProps {
  return {
    canRedo: false,
    canUndo: false,
    onFit: vi.fn(),
    onRedo: vi.fn(),
    onToggleSnap: vi.fn(),
    onUndo: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    snapEnabled: true,
    ...overrides,
  };
}

describe('FloorToolbar', () => {
  it('renders all buttons with accessible labels', () => {
    const component = render(<FloorToolbar {...baseProps()} />);

    expect(
      component.getByRole('button', { name: 'Zoom out' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Zoom in' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Fit to screen' }),
    ).toBeInTheDocument();
    expect(component.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(component.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Toggle grid snapping' }),
    ).toBeInTheDocument();
  });

  it('disables Undo/Redo based on canUndo/canRedo', () => {
    const component = render(
      <FloorToolbar {...baseProps({ canRedo: false, canUndo: true })} />,
    );

    expect(component.getByRole('button', { name: 'Undo' })).toBeEnabled();
    expect(component.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('reflects snapEnabled via aria-pressed', () => {
    const enabled = render(
      <FloorToolbar {...baseProps({ snapEnabled: true })} />,
    );
    expect(
      enabled.getByRole('button', { name: 'Toggle grid snapping' }),
    ).toHaveAttribute('aria-pressed', 'true');
    enabled.unmount();

    const disabled = render(
      <FloorToolbar {...baseProps({ snapEnabled: false })} />,
    );
    expect(
      disabled.getByRole('button', { name: 'Toggle grid snapping' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('wires each button to its callback', async () => {
    const user = userEvent.setup();
    const props = baseProps({ canRedo: true, canUndo: true });
    const component = render(<FloorToolbar {...props} />);

    await user.click(component.getByRole('button', { name: 'Zoom out' }));
    expect(props.onZoomOut).toHaveBeenCalledTimes(1);

    await user.click(component.getByRole('button', { name: 'Zoom in' }));
    expect(props.onZoomIn).toHaveBeenCalledTimes(1);

    await user.click(component.getByRole('button', { name: 'Fit to screen' }));
    expect(props.onFit).toHaveBeenCalledTimes(1);

    await user.click(component.getByRole('button', { name: 'Undo' }));
    expect(props.onUndo).toHaveBeenCalledTimes(1);

    await user.click(component.getByRole('button', { name: 'Redo' }));
    expect(props.onRedo).toHaveBeenCalledTimes(1);

    await user.click(
      component.getByRole('button', { name: 'Toggle grid snapping' }),
    );
    expect(props.onToggleSnap).toHaveBeenCalledTimes(1);
  });

  it('does not fire onUndo/onRedo when disabled', async () => {
    const user = userEvent.setup();
    const props = baseProps({ canRedo: false, canUndo: false });
    const component = render(<FloorToolbar {...props} />);

    await user.click(component.getByRole('button', { name: 'Undo' }));
    await user.click(component.getByRole('button', { name: 'Redo' }));

    expect(props.onUndo).not.toHaveBeenCalled();
    expect(props.onRedo).not.toHaveBeenCalled();
  });
});
