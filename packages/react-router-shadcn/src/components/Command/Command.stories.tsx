import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import { Command } from './Command';
import { CommandDialog } from './CommandDialog';
import { CommandEmpty } from './CommandEmpty';
import { CommandGroup } from './CommandGroup';
import { CommandInput } from './CommandInput';
import { CommandItem } from './CommandItem';
import { CommandList } from './CommandList';
import { CommandSeparator } from './CommandSeparator';
import { CommandShortcut } from './CommandShortcut';

const meta = {
  component: Command,
  parameters: { controls: { disable: true } },
  title: 'Components/Command',
} satisfies Meta<typeof Command>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The inline palette. `CommandEmpty` is what shows when the filter matches
 * nothing — type into the input to see it.
 */
export const Default: Story = {
  render: () => (
    <Command className="w-96 rounded-md border">
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Plans">
          <CommandItem>
            Create plan
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>Search plans</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Builds">
          <CommandItem>Re-run last build</CommandItem>
          <CommandItem disabled={true}>Promote (locked)</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

/** `CommandDialog` is the same palette in a modal — the ⌘K surface. */
export const InDialog: Story = {
  render: function InDialogStory() {
    const [open, setOpen] = React.useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)} variant="outline">
          Open command palette
        </Button>
        <CommandDialog onOpenChange={setOpen} open={open}>
          <CommandInput placeholder="Type a command or search…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Plans">
              <CommandItem>Create plan</CommandItem>
              <CommandItem>Search plans</CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </>
    );
  },
};
