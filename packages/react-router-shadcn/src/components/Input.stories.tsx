import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';
import { Label } from './Label';

const meta = {
  args: { placeholder: 'you@example.com' },
  component: Input,
  title: 'Components/Input',
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * `Input` has no `cva` map — its appearance is driven by native attributes and
 * ARIA rather than variant props, so this state grid is what stands in for a
 * variant matrix. `aria-invalid` is the one worth watching: the destructive
 * border and ring come from the attribute, not from a prop.
 */
export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <Input placeholder="Default" />
      <Input defaultValue="With a value" />
      <Input disabled={true} placeholder="Disabled" />
      <Input defaultValue="Read only" readOnly={true} />
      <Input aria-invalid={true} placeholder="Invalid (aria-invalid)" />
    </div>
  ),
};

/** The pairing apps actually ship: a `Label` bound to the input by `htmlFor`. */
export const WithLabel: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <Label htmlFor="workbench-input-email">Email</Label>
      <Input
        id="workbench-input-email"
        placeholder="you@example.com"
        type="email"
      />
    </div>
  ),
};

export const Types: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <Input placeholder="text" type="text" />
      <Input placeholder="password" type="password" />
      <Input type="number" />
      <Input type="date" />
      <Input type="file" />
    </div>
  ),
};
