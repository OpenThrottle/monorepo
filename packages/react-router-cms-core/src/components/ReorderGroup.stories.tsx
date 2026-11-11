import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { MOCK_REORDER_ITEMS } from '../data/mock.reorder';
import { ReorderGroup } from './ReorderGroup';

const meta = {
  title: 'Components/ReorderGroup',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DndProvider backend={HTML5Backend}>
      <ReorderGroup
        className="max-w-md"
        getItemId={(item) => item.id}
        renderItem={(item) => item.text}
        source={{
          defaultItems: MOCK_REORDER_ITEMS,
          kind: 'uncontrolled',
          onReorder: undefined,
        }}
      />
    </DndProvider>
  ),
};
