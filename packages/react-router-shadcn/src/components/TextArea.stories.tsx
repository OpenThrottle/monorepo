import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from './Label';
import { TextArea } from './TextArea';

const meta = {
  args: { placeholder: 'Describe what changed…' },
  component: TextArea,
  title: 'Components/TextArea',
} satisfies Meta<typeof TextArea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-96">
      <TextArea {...args} />
    </div>
  ),
};

/** Like `Input`, the states come from native attributes and ARIA, not props. */
export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-96 flex-col gap-4">
      <TextArea placeholder="Default" />
      <TextArea defaultValue="With a value" />
      <TextArea disabled={true} placeholder="Disabled" />
      <TextArea defaultValue="Read only" readOnly={true} />
      <TextArea aria-invalid={true} placeholder="Invalid (aria-invalid)" />
    </div>
  ),
};

export const WithLabel: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-96 flex-col gap-2">
      <Label htmlFor="workbench-textarea">Release notes</Label>
      <TextArea id="workbench-textarea" rows={6} />
    </div>
  ),
};
