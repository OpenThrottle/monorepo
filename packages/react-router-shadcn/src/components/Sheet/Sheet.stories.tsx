import type { Meta, StoryObj } from '@storybook/react-vite';
import type { VariantProps } from 'class-variance-authority';
import { Button } from '../Button';
import { Input } from '../Input';
import { Label } from '../Label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './index';
import type { sheetVariants } from './sheets';

const SIDES: readonly NonNullable<
  VariantProps<typeof sheetVariants>['side']
>[] = ['top', 'right', 'bottom', 'left'];

const meta = {
  component: Sheet,
  parameters: { controls: { disable: true } },
  title: 'Components/Sheet',
} satisfies Meta<typeof Sheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A `Dialog` that slides in from an edge rather than centring. */
export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild={true}>
        <Button variant="outline">Edit project</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit project</SheetTitle>
          <SheetDescription>Changes apply to new builds only.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4">
          <Label htmlFor="workbench-sheet-name">Name</Label>
          <Input defaultValue="openthrottle" id="workbench-sheet-name" />
        </div>
        <SheetFooter>
          <Button>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

/**
 * The `side` variant lives on `SheetContent`, not on the root — the root is
 * Radix's Dialog re-exported directly.
 */
export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {SIDES.map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild={true}>
            <Button variant="outline">{side}</Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Opened from {side}</SheetTitle>
              <SheetDescription>
                Top and bottom span the width; left and right span the height.
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  ),
};
