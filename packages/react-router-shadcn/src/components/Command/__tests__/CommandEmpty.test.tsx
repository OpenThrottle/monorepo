import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Command } from '../Command';
import { CommandEmpty } from '../CommandEmpty';
import { CommandList } from '../CommandList';

describe('CommandEmpty', () => {
  test('renders the empty state when no items match', () => {
    render(
      <Command>
        <CommandList>
          <CommandEmpty>No results found</CommandEmpty>
        </CommandList>
      </Command>,
    );
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });
});
