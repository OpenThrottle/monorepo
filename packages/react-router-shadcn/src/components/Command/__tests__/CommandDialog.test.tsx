import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CommandDialog } from '../CommandDialog';
import { CommandInput } from '../CommandInput';
import { CommandItem } from '../CommandItem';
import { CommandList } from '../CommandList';

describe('CommandDialog', () => {
  test('renders the command palette inside an open dialog', () => {
    render(
      <CommandDialog open={true}>
        <CommandInput placeholder="Type a command" />
        <CommandList>
          <CommandItem>Run</CommandItem>
        </CommandList>
      </CommandDialog>,
    );
    expect(screen.getByPlaceholderText('Type a command')).toBeInTheDocument();
    expect(screen.getByText('Run')).toBeInTheDocument();
  });
});
