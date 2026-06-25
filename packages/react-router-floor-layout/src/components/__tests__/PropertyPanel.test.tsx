import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DisplayUnit, FloorElementType, type FloorElement } from '../../types';
import { createFloorElement } from '../../utils/elements';
import { type ElementEditPatch, PropertyPanel } from '../PropertyPanel';

function tableFixture(): FloorElement {
  return {
    ...createFloorElement({
      center: { x: 60, y: 60 },
      id: 't1',
      type: FloorElementType.TABLE_SQUARE,
    }),
    label: 'T1',
  };
}

describe('PropertyPanel', () => {
  it('lets the Seats field be cleared and retyped', async () => {
    const user = userEvent.setup();
    const patches: ElementEditPatch[] = [];
    const onChange = vi.fn((patch: ElementEditPatch) => patches.push(patch));
    const component = render(
      <PropertyPanel
        displayUnit={DisplayUnit.FT_IN}
        element={tableFixture()}
        onChange={onChange}
        onDelete={() => {}}
      />,
    );

    const seats = component.getByLabelText('Seats');
    await user.clear(seats);
    // The field is empty while focused — it does not snap back.
    expect(seats).toHaveValue(null);

    await user.type(seats, '6');
    expect(seats).toHaveValue(6);
    expect(patches.at(-1)?.seats).toBe(6);
  });

  it('does not commit empty/intermediate Seats input', async () => {
    const user = userEvent.setup();
    const patches: ElementEditPatch[] = [];
    const component = render(
      <PropertyPanel
        displayUnit={DisplayUnit.FT_IN}
        element={tableFixture()}
        onChange={(patch) => patches.push(patch)}
        onDelete={() => {}}
      />,
    );

    await user.clear(component.getByLabelText('Seats'));

    expect(patches).toHaveLength(0);
  });

  it('lets the Rotation field be cleared and retyped', async () => {
    const user = userEvent.setup();
    const patches: ElementEditPatch[] = [];
    const component = render(
      <PropertyPanel
        displayUnit={DisplayUnit.FT_IN}
        element={tableFixture()}
        onChange={(patch) => patches.push(patch)}
        onDelete={() => {}}
      />,
    );

    const rotation = component.getByLabelText('Rotation (°)');
    await user.clear(rotation);
    expect(rotation).toHaveValue(null);

    await user.type(rotation, '45');
    expect(patches.at(-1)?.rotation).toBe(45);
  });
});
