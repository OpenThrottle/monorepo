import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Command } from '../Command';
import { CommandItem } from '../CommandItem';
import { CommandList } from '../CommandList';

describe('CommandList', () => {
  test('renders the cmdk list wrapping its items', () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandItem>Banana</CommandItem>
        </CommandList>
      </Command>,
    );
    expect(container.querySelector('[cmdk-list]')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });
});
