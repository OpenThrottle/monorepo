import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { FloorElementType, type FloorLayout } from '../../types';
import { createFloorElement } from '../../utils/elements';
import { addElement, createEmptyLayout } from '../../utils/layout-operations';
import { FloorLayoutEditor } from '../FloorLayoutEditor';

function fixture(): FloorLayout {
  const table = {
    ...createFloorElement({
      center: { x: 60, y: 60 },
      id: 't1',
      type: FloorElementType.TABLE_SQUARE,
    }),
    label: 'T1',
  };
  return addElement(createEmptyLayout({ id: 'layout-1' }), table);
}

describe('FloorLayoutEditor', () => {
  it('selects an element on click and shows its properties', async () => {
    const user = userEvent.setup();
    const selections: (string | null)[] = [];
    const component = render(
      <FloorLayoutEditor
        defaultValue={fixture()}
        onSelectionChange={(id) => selections.push(id)}
      />,
    );

    await user.click(component.getByRole('img', { name: 'table square: T1' }));

    expect(selections).toContain('t1');
    expect(component.getByLabelText('Label')).toBeDefined();
    expect(component.getByLabelText('Seats')).toBeDefined();
  });

  it('commits a label edit through onChange', async () => {
    const user = userEvent.setup();
    const changes: FloorLayout[] = [];
    const component = render(
      <FloorLayoutEditor
        defaultValue={fixture()}
        onChange={(layout) => changes.push(layout)}
      />,
    );

    await user.click(component.getByRole('img', { name: 'table square: T1' }));
    const input = component.getByLabelText('Label');
    await user.clear(input);
    await user.type(input, 'Patio');

    expect(changes.at(-1)?.elements[0]?.label).toBe('Patio');
  });

  it('deletes the selected element via the delete button', async () => {
    const user = userEvent.setup();
    const changes: FloorLayout[] = [];
    const component = render(
      <FloorLayoutEditor
        defaultValue={fixture()}
        onChange={(layout) => changes.push(layout)}
      />,
    );

    await user.click(component.getByRole('img', { name: 'table square: T1' }));
    await user.click(component.getByRole('button', { name: 'Delete' }));

    expect(changes.at(-1)?.elements).toHaveLength(0);
  });

  it('nudges with the keyboard and undoes with Ctrl+Z', async () => {
    const user = userEvent.setup();
    const changes: FloorLayout[] = [];
    const component = render(
      <FloorLayoutEditor
        defaultValue={fixture()}
        onChange={(layout) => changes.push(layout)}
      />,
    );

    await user.click(component.getByRole('img', { name: 'table square: T1' }));
    await user.keyboard('{ArrowRight}');
    expect(changes.at(-1)?.elements[0]?.x).toBe(72);

    await user.keyboard('{Control>}z{/Control}');
    expect(changes.at(-1)?.elements[0]?.x).toBe(60);
  });

  it('creates an element by dragging from the palette', async () => {
    const user = userEvent.setup();
    const changes: FloorLayout[] = [];
    const component = render(
      <FloorLayoutEditor
        defaultValue={fixture()}
        onChange={(layout) => changes.push(layout)}
      />,
    );

    const round = component.getByRole('button', { name: 'Round table' });
    const svg = component.container.querySelector('svg');
    expect(svg).not.toBeNull();

    await user.pointer([
      { keys: '[MouseLeft>]', target: round },
      { coords: { x: 40, y: 40 }, target: svg ?? undefined },
      { keys: '[/MouseLeft]' },
    ]);

    expect(changes.at(-1)?.elements).toHaveLength(2);
  });
});
