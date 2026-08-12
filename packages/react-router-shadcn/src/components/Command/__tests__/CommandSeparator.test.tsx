import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Command } from '../Command';
import { CommandList } from '../CommandList';
import { CommandSeparator } from '../CommandSeparator';

describe('CommandSeparator', () => {
  test('renders a cmdk separator', () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandSeparator />
        </CommandList>
      </Command>,
    );
    expect(container.querySelector('[cmdk-separator]')).toBeInTheDocument();
  });
});
