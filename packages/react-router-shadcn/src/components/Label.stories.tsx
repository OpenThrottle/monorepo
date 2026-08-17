import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';
import { Label } from './Label';

const meta = {
  args: { children: 'Email' },
  component: Label,
  title: 'Components/Label',
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * `Label` is a Radix `Label.Root`, so `htmlFor` gives it real click-to-focus
 * behaviour — clicking the label focuses the input. It is deliberately styled
 * as muted supporting text rather than a heading.
 */
export const WithInput: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <Label htmlFor="workbench-label-name">Full name</Label>
      <Input id="workbench-label-name" placeholder="Ada Lovelace" />
    </div>
  ),
};

/**
 * The disabled styling is inherited, not set: the label dims via
 * `peer-disabled:` (a disabled sibling input) or `group-data-[disabled=true]:`
 * (a disabled wrapper). Setting `disabled` on the label itself does nothing.
 */
export const DisabledPeer: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <Input className="peer" disabled={true} id="workbench-label-disabled" />
      <Label htmlFor="workbench-label-disabled">
        Dimmed by the disabled peer input
      </Label>
    </div>
  ),
};
