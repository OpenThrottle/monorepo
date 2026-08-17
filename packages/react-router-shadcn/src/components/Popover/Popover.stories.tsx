import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import { Input } from '../Input';
import { Label } from '../Label';
import { Popover } from './Popover';
import { PopoverContent } from './PopoverContent';
import { PopoverDescription } from './PopoverDescription';
import { PopoverHeader } from './PopoverHeader';
import { PopoverTitle } from './PopoverTitle';
import { PopoverTrigger } from './PopoverTrigger';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

const meta = {
  component: Popover,
  parameters: { controls: { disable: true } },
  title: 'Components/Popover',
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Unlike `Tooltip`, a popover is click-triggered and can hold focusable
 * content — so form controls inside it are reachable.
 */
export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild={true}>
        <Button variant="outline">Set retention</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <PopoverHeader>
          <PopoverTitle>Retention</PopoverTitle>
          <PopoverDescription>
            Artifacts older than this are pruned nightly.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex flex-col gap-2 pt-3">
          <Label htmlFor="workbench-popover-days">Days</Label>
          <Input defaultValue="30" id="workbench-popover-days" type="number" />
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-16">
      {SIDES.map((side) => (
        <Popover defaultOpen={true} key={side}>
          <PopoverTrigger asChild={true}>
            <Button variant="outline">{side}</Button>
          </PopoverTrigger>
          <PopoverContent side={side}>Placed {side}.</PopoverContent>
        </Popover>
      ))}
    </div>
  ),
};
