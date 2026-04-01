import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import { MoveToFolderDropdown } from '../MoveToFolderDropdown';
import { MOCK_FOLDERS } from '~/global/data/mock.mail';

describe('MoveToFolderDropdown', () => {
  test('renders trigger and folder items when dropdown and submenu are opened', async () => {
    const user = userEvent.setup();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <MoveToFolderDropdown
            folders={MOCK_FOLDERS}
            onSelect={() => {}}
            triggerLabel="Move to folder"
          />
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(
      screen.getByTestId('MoveToFolderDropdown-trigger'),
    ).toHaveTextContent('Move to folder');

    await user.click(screen.getByTestId('MoveToFolderDropdown-trigger'));
    expect(
      screen.getByTestId('MoveToFolderDropdown-content'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('MoveToFolderDropdown-item-inbox'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('MoveToFolderDropdown-item-sent'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('MoveToFolderDropdown-item-drafts'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('MoveToFolderDropdown-item-trash'),
    ).toBeInTheDocument();
  });
});
