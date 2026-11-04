import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '../index';

describe('ContextMenuLabel', () => {
  test('renders inside an open context menu', async () => {
    const user = userEvent.setup();
    const component = render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Section</ContextMenuLabel>
        </ContextMenuContent>
      </ContextMenu>,
    );
    await user.pointer({
      keys: '[MouseRight]',
      target: component.getByText('Area'),
    });
    expect(component.getByText('Section')).toBeInTheDocument();
  });
});
