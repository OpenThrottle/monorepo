import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../index';

describe('ContextMenuItem', () => {
  test('renders inside an open context menu', async () => {
    const user = userEvent.setup();
    const component = render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Action</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    await user.pointer({
      keys: '[MouseRight]',
      target: component.getByText('Area'),
    });
    const item = document.body.querySelector('[role="menuitem"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Action');
  });
});
