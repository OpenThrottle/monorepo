import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { beforeEach, describe, expect, test } from 'vitest';

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
});
