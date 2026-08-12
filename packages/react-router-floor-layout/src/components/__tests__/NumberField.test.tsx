import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NumberField } from '../NumberField';

describe('NumberField', () => {
  it('renders the label and reflects the canonical value', () => {
    const component = render(
      <NumberField id="width" label="Width" onCommit={vi.fn()} value={24} />,
    );

    expect(component.getByLabelText('Width')).toHaveValue(24);
  });

  it('commits a parsed numeric value on change', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const component = render(
      <NumberField id="width" label="Width" onCommit={onCommit} value={24} />,
    );

    const input = component.getByLabelText('Width');
    await user.clear(input);
    await user.type(input, '30');

    expect(onCommit).toHaveBeenLastCalledWith(30);
  });

  it('never commits on empty/invalid intermediate input', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const component = render(
      <NumberField id="width" label="Width" onCommit={onCommit} value={24} />,
    );

    const input = component.getByLabelText('Width');
    await user.clear(input);

    expect(onCommit).not.toHaveBeenCalled();
    // Draft is shown as empty while editing, not reverted to canonical value.
    expect(input).toHaveValue(null);
  });

  it('rounds to a whole number when integer is set', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const component = render(
      <NumberField
        id="seats"
        integer={true}
        label="Seats"
        onCommit={onCommit}
        value={2}
      />,
    );

    const input = component.getByLabelText('Seats');
    await user.clear(input);
    await user.type(input, '3.7');

    expect(onCommit).toHaveBeenLastCalledWith(4);
  });

  it('clamps committed values to min', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const component = render(
      <NumberField
        id="seats"
        label="Seats"
        min={0}
        onCommit={onCommit}
        value={2}
      />,
    );

    const input = component.getByLabelText('Seats');
    await user.clear(input);
    await user.type(input, '-5');

    expect(onCommit).toHaveBeenLastCalledWith(0);
  });

  it('reconciles the draft back to the canonical value on blur', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const component = render(
      <NumberField id="width" label="Width" onCommit={onCommit} value={24} />,
    );

    const input = component.getByLabelText('Width');
    await user.clear(input);
    await user.type(input, '99');
    await user.tab();

    // After blur the draft clears, so the field reflects the canonical prop
    // value (the parent may or may not have re-rendered with the new value —
    // here it's still 24 since we passed a static prop).
    expect(input).toHaveValue(24);
  });
});
