import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { Command } from '../Command';
import { CommandGroup } from '../CommandGroup';
import { CommandItem } from '../CommandItem';
import { CommandList } from '../CommandList';

describe('CommandGroup', () => {
  test('renders a cmdk group with a heading', () => {
    const component = render(
      <Command>
        <CommandList>
          <CommandGroup heading="Fruits">
            <CommandItem>Date</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    expect(
      component.container.querySelector('[cmdk-group]'),
    ).toBeInTheDocument();
    expect(component.getByText('Fruits')).toBeInTheDocument();
  });
});
