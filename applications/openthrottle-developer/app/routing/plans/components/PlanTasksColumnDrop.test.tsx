import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanTasksColumnDrop } from './PlanTasksColumnDrop';
import type { PlanTasksColumnDropProps } from './PlanTasksColumnDrop';

const renderColumn = (props: PlanTasksColumnDropProps): RenderResult =>
  render(
    <DndProvider backend={HTML5Backend}>
      <PlanTasksColumnDrop {...props} />
    </DndProvider>,
  );

describe('PlanTasksColumnDrop Component', () => {
  let component: RenderResult;
  let props: PlanTasksColumnDropProps;

  beforeEach(() => {
    props = {
      acceptsDrop: true,
      children: <div data-testid="child-card">Task card</div>,
      columnId: 'pending',
      columnKey: 'PENDING',
      emptyLabel: 'No tasks',
      onDropTask: vi.fn(),
      title: 'Pending',
    };

    component = renderColumn(props);
  });

  test('renders the underlying column with title and children', () => {
    expect(
      component.getByTestId('PlanTasksColumn-pending'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'Pending' }),
    ).toBeInTheDocument();
    expect(component.getByTestId('child-card')).toBeInTheDocument();
  });

  test('renders the region as a drop target when acceptsDrop is true', () => {
    const region = component.getByRole('region', { name: 'Pending' });
    expect(region).toBeInTheDocument();
  });

  test('renders without a droppable ref when acceptsDrop is false', () => {
    component.unmount();
    props = { ...props, acceptsDrop: false };
    component = renderColumn(props);

    expect(
      component.getByTestId('PlanTasksColumn-pending'),
    ).toBeInTheDocument();
    expect(component.getByTestId('child-card')).toBeInTheDocument();
  });
});
