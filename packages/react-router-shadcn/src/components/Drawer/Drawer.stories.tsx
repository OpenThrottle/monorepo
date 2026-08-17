import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './index';

const DIRECTIONS = ['top', 'right', 'bottom', 'left'] as const;

const meta = {
  component: Drawer,
  parameters: { controls: { disable: true } },
  title: 'Components/Drawer',
} satisfies Meta<typeof Drawer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Built on Vaul rather than Radix, so it is drag-dismissable — the visible
 * handle is not decoration. `Sheet` is the Radix equivalent without the drag
 * behaviour.
 */
export const Default: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild={true}>
        <Button variant="outline">Open drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Deploy to production</DrawerTitle>
          <DrawerDescription>
            This promotes the current preview build.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button>Deploy</Button>
          <DrawerClose asChild={true}>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

/** `direction` is a prop on the ROOT here, unlike Sheet's `side` on content. */
export const Directions: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {DIRECTIONS.map((direction) => (
        <Drawer direction={direction} key={direction}>
          <DrawerTrigger asChild={true}>
            <Button variant="outline">{direction}</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Opened from {direction}</DrawerTitle>
              <DrawerDescription>Drag the handle to dismiss.</DrawerDescription>
            </DrawerHeader>
          </DrawerContent>
        </Drawer>
      ))}
    </div>
  ),
};
