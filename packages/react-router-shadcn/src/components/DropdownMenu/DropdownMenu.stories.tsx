import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './index';

const meta = {
  component: DropdownMenu,
  parameters: { controls: { disable: true } },
  title: 'Components/DropdownMenu',
} satisfies Meta<typeof DropdownMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Build 4821</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          Re-run
          <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          Download logs
          <DropdownMenuShortcut>⌘L</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={true}>Promote (locked)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/** Checkbox and radio items are controlled, so the story holds their state. */
export const CheckboxAndRadioItems: Story = {
  render: function CheckboxAndRadioItemsStory() {
    const [showPassed, setShowPassed] = React.useState(true);
    const [showFailed, setShowFailed] = React.useState(false);
    const [range, setRange] = React.useState('7d');

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild={true}>
          <Button variant="outline">Filters</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={showPassed}
            onCheckedChange={setShowPassed}
          >
            Passed
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showFailed}
            onCheckedChange={setShowFailed}
          >
            Failed
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Range</DropdownMenuLabel>
          <DropdownMenuRadioGroup onValueChange={setRange} value={range}>
            <DropdownMenuRadioItem value="7d">7 days</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="30d">30 days</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
};

/** A submenu — `DropdownMenuSub` wraps its own trigger and content. */
export const WithSubmenu: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem>Re-run</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Deploy to…</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Staging</DropdownMenuItem>
            <DropdownMenuItem>Production</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
