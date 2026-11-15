import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { Command } from '../Command';
import { CommandItem } from '../CommandItem';
import { CommandList } from '../CommandList';

describe('CommandList', () => {
  test('renders the cmdk list wrapping its items', () => {
    const component = render(
      <Command>
        <CommandList>
          <CommandItem>Banana</CommandItem>
        </CommandList>
      </Command>,
    );
    expect(
      component.container.querySelector('[cmdk-list]'),
    ).toBeInTheDocument();
    expect(component.getByText('Banana')).toBeInTheDocument();
  });
});
