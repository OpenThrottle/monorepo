import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../Command';

describe('Command', () => {
  it('renders command with input and list', () => {
    const { container } = render(
      <Command>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Frameworks">
            <CommandItem value="next">Next.js</CommandItem>
            <CommandItem value="remix">Remix</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    const input = container.querySelector('input[placeholder="Search..."]');
    expect(input).toBeInTheDocument();
    expect(container.textContent).toContain('Next.js');
    expect(container.textContent).toContain('Remix');
  });

  it('shows empty state when no items match', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Command>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Frameworks">
            <CommandItem value="next">Next.js</CommandItem>
            <CommandItem value="remix">Remix</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    const input = container.querySelector('input');
    expect(input).toBeInTheDocument();
    await user.type(input as HTMLInputElement, 'astro');
    expect(container.textContent).toContain('No results.');
  });
});
