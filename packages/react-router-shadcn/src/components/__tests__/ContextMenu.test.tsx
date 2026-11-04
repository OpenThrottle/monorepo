import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../ContextMenu';

describe('ContextMenu', () => {
  it('should render trigger area', () => {
    const component = render(
      <ContextMenu>
        <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
      </ContextMenu>,
    );
    expect(component.getByText('Right-click me')).toBeInTheDocument();
  });

  it('should render ContextMenuContent after contextmenu event', async () => {
    const user = userEvent.setup();
    const component = render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>One</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    await user.pointer({
      keys: '[MouseRight]',
      target: component.getByText('Area'),
    });

    const menu = document.body.querySelector('[role="menu"]');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveTextContent('One');
  });

  it('should render ContextMenuItem with role menuitem when open', async () => {
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
