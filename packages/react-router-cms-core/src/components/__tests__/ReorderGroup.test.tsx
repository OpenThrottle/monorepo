import type { RenderResult } from '@testing-library/react';
// eslint-disable-next-line openthrottle/no-fire-event -- userEvent has no drag API; the HTML5 dnd backend needs native dragstart/dragend with a dataTransfer.
import { fireEvent, render, within } from '@testing-library/react';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { MockReorderItem } from '../../data/mock.reorder';
import { MOCK_REORDER_ITEMS } from '../../data/mock.reorder';
import { ReorderGroup } from '../ReorderGroup';

describe('ReorderGroup', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = render(
      <DndProvider backend={HTML5Backend}>
        <ReorderGroup<MockReorderItem>
          className={undefined}
          getItemId={(item) => item.id}
          onDrop={undefined}
          renderItem={(item) => item.text}
          source={{
            defaultItems: MOCK_REORDER_ITEMS,
            kind: 'uncontrolled',
            onReorder: undefined,
          }}
        />
      </DndProvider>,
    );
  });

  test('renders a list with one item per entry', () => {
    expect(component.getByRole('list')).toBeInTheDocument();
    expect(component.getAllByRole('listitem')).toHaveLength(
      MOCK_REORDER_ITEMS.length,
    );
  });

  test('renders each entry through renderItem, in order', () => {
    const rows = component.getAllByRole('listitem');

    expect(rows[0]).toHaveTextContent(MOCK_REORDER_ITEMS[0]?.text ?? '');
    expect(rows.at(-1)).toHaveTextContent(
      MOCK_REORDER_ITEMS.at(-1)?.text ?? '',
    );
  });

  describe('when a drag ends', () => {
    test('reports the order once through onDrop', () => {
      const onDrop = vi.fn();
      const view = render(
        <DndProvider backend={HTML5Backend}>
          <ReorderGroup<MockReorderItem>
            className={undefined}
            getItemId={(item) => item.id}
            onDrop={onDrop}
            renderItem={(item) => item.text}
            source={{
              defaultItems: MOCK_REORDER_ITEMS,
              kind: 'uncontrolled',
              onReorder: undefined,
            }}
          />
        </DndProvider>,
      );
      // `render` queries the whole body, which also holds the beforeEach group.
      const [handle] = within(view.container).getAllByRole('button');
      const dataTransfer = {
        dropEffect: 'move',
        effectAllowed: 'move',
        getData: () => '',
        setData: () => undefined,
        setDragImage: () => undefined,
        types: [],
      };

      if (!handle) throw new Error('no drag handle rendered');
      fireEvent.dragStart(handle, { dataTransfer });
      fireEvent.dragEnd(handle, { dataTransfer });

      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(onDrop).toHaveBeenCalledWith(MOCK_REORDER_ITEMS);
    });
  });
});
