import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../index';

describe('ContextMenuSeparator', () => {
  test('renders inside an open context menu', async () => {
    const user = userEvent.setup();
    const component = render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSeparator />
        </ContextMenuContent>
      </ContextMenu>,
    );
    await user.pointer({
      keys: '[MouseRight]',
      target: component.getByText('Area'),
    });
    const sep = document.body.querySelector('[role="separator"]');
    expect(sep).toBeInTheDocument();
  });
});
