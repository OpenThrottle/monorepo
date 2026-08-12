import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuTrigger,
} from '../index';

describe('ContextMenuCheckboxItem', () => {
  test('renders inside an open context menu', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuCheckboxItem checked={true}>
            Toggle
          </ContextMenuCheckboxItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText('Area'));
    const item = document.body.querySelector('[role="menuitemcheckbox"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Toggle');
  });
});
