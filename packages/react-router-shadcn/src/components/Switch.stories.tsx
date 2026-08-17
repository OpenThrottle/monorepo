import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from './Label';
import { Switch } from './Switch';

const meta = {
  component: Switch,
  title: 'Components/Switch',
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-4">
      <Switch />
      <Switch defaultChecked={true} />
      <Switch disabled={true} />
      <Switch defaultChecked={true} disabled={true} />
    </div>
  ),
};

/** Bound to a `Label` by id, so the label text is a click target too. */
export const WithLabel: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="workbench-switch" />
      <Label htmlFor="workbench-switch">Notify me on failed builds</Label>
    </div>
  ),
};
