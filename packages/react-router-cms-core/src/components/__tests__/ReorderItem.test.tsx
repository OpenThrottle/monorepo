import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { REORDER_HANDLE_COPY } from '../../data';
import { ReorderItem } from '../ReorderItem';

describe('ReorderItem', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = render(
      <DndProvider backend={HTML5Backend}>
        <ReorderItem className={undefined} id="a" index={0} onMove={vi.fn()}>
          Row content
        </ReorderItem>
      </DndProvider>,
    );
  });

  test('renders a list item holding the content and a handle', () => {
    const row = component.getByRole('listitem');

    expect(row).toHaveTextContent('Row content');
    expect(
      component.getByRole('button', { name: REORDER_HANDLE_COPY.label }),
    ).toBeInTheDocument();
  });

  test('registers with react-dnd and is not dragging', () => {
    const row = component.getByRole('listitem');

    expect(row).toHaveAttribute('data-handler-id');
    expect(row).toHaveAttribute('data-dragging', 'false');
  });
});
