import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Command } from '../Command';
import { CommandItem } from '../CommandItem';
import { CommandList } from '../CommandList';

describe('CommandItem', () => {
  test('renders a selectable cmdk item', () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandItem>Cherry</CommandItem>
        </CommandList>
      </Command>,
    );
    const item = container.querySelector('[cmdk-item]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Cherry');
  });
});
