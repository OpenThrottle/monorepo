import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Command } from '../Command';
import { CommandItem } from '../CommandItem';
import { CommandList } from '../CommandList';

describe('Command', () => {
  test('renders the cmdk root and its children', () => {
    const { container } = render(
      <Command className="custom-command">
        <CommandList>
          <CommandItem>Apple</CommandItem>
        </CommandList>
      </Command>,
    );
    const root = container.querySelector('[cmdk-root]');
    expect(root).toBeInTheDocument();
    expect(root).toHaveClass('custom-command');
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });
});
