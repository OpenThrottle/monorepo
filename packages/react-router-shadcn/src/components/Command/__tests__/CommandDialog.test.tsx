import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { CommandDialog } from '../CommandDialog';
import { CommandInput } from '../CommandInput';
import { CommandItem } from '../CommandItem';
import { CommandList } from '../CommandList';

describe('CommandDialog', () => {
  test('renders the command palette inside an open dialog', () => {
    const component = render(
      <CommandDialog open={true}>
        <CommandInput placeholder="Type a command" />
        <CommandList>
          <CommandItem>Run</CommandItem>
        </CommandList>
      </CommandDialog>,
    );
    expect(
      component.getByPlaceholderText('Type a command'),
    ).toBeInTheDocument();
    expect(component.getByText('Run')).toBeInTheDocument();
  });
});
