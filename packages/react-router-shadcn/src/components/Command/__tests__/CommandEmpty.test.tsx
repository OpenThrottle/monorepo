import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { Command } from '../Command';
import { CommandEmpty } from '../CommandEmpty';
import { CommandList } from '../CommandList';

describe('CommandEmpty', () => {
  test('renders the empty state when no items match', () => {
    const component = render(
      <Command>
        <CommandList>
          <CommandEmpty>No results found</CommandEmpty>
        </CommandList>
      </Command>,
    );
    expect(component.getByText('No results found')).toBeInTheDocument();
  });
});
