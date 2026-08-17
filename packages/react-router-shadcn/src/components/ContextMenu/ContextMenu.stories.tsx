import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from './index';

const meta = {
  component: ContextMenu,
  parameters: { controls: { disable: true } },
  title: 'Components/ContextMenu',
} satisfies Meta<typeof ContextMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Opened by right-click on the trigger region rather than by a button — so the
 * trigger needs to be a visible, sizeable target for the story to be usable.
 */
export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-40 w-96 items-center justify-center rounded-md border border-dashed text-sm">
        Right-click here
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>Build 4821</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem>
          Re-run
          <ContextMenuShortcut>⌘R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>Download logs</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Deploy to…</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Staging</ContextMenuItem>
            <ContextMenuItem>Production</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={true}>Promote (locked)</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};
