import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from './index';

const meta = {
  component: Menubar,
  parameters: { controls: { disable: true } },
  title: 'Components/Menubar',
} satisfies Meta<typeof Menubar>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A persistent application menu bar: unlike `DropdownMenu`, the triggers stay
 * visible, and once one menu is open the others open on hover.
 */
export const Default: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            New plan
            <MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Open…
            <MenubarShortcut>⌘O</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Export as…</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>Markdown</MenubarItem>
              <MenubarItem>JSON</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            Undo
            <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled={true}>Redo</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Toggle sidebar</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};
