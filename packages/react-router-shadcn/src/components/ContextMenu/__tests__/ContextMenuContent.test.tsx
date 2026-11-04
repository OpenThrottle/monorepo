import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '../index';

describe('ContextMenuContent', () => {
  test('renders inside an open context menu', async () => {
    const user = userEvent.setup();
    const component = render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <div>Menu body</div>
        </ContextMenuContent>
      </ContextMenu>,
    );
    await user.pointer({
      keys: '[MouseRight]',
      target: component.getByText('Area'),
    });
    const menu = document.body.querySelector('[role="menu"]');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveTextContent('Menu body');
  });
});
