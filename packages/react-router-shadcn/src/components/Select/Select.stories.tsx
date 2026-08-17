import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from '../Label';
import { Select, SelectGroup, SelectValue } from './index';
import { SelectContent } from './SelectContent';
import { SelectItem } from './SelectItem';
import { SelectLabel } from './SelectLabel';
import { SelectSeparator } from './SelectSeparator';
import { SelectTrigger } from './SelectTrigger';

const meta = {
  component: Select,
  parameters: { controls: { disable: true } },
  title: 'Components/Select',
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `Select` is Radix's `Select.Root` re-exported directly — it renders nothing
 * on its own. The trigger and the portalled content are separate exports, so
 * every story here composes the family rather than showing a part in
 * isolation.
 */
export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Choose an environment" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="development">Development</SelectItem>
        <SelectItem value="staging">Staging</SelectItem>
        <SelectItem value="production">Production</SelectItem>
      </SelectContent>
    </Select>
  ),
};

/** `SelectGroup` + `SelectLabel` + `SelectSeparator` for a longer list. */
export const Grouped: Story = {
  render: () => (
    <Select defaultValue="us-east-1">
      <SelectTrigger className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Americas</SelectLabel>
          <SelectItem value="us-east-1">us-east-1</SelectItem>
          <SelectItem value="us-west-2">us-west-2</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Europe</SelectLabel>
          <SelectItem value="eu-west-1">eu-west-1</SelectItem>
          <SelectItem value="eu-central-1">eu-central-1</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex w-64 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="workbench-select-default">Default</Label>
        <Select>
          <SelectTrigger id="workbench-select-default">
            <SelectValue placeholder="Unset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Option A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="workbench-select-disabled">Disabled</Label>
        <Select disabled={true}>
          <SelectTrigger id="workbench-select-disabled">
            <SelectValue placeholder="Unavailable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Option A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="workbench-select-item-disabled">
          With a disabled item
        </Label>
        <Select>
          <SelectTrigger id="workbench-select-item-disabled">
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Available</SelectItem>
            <SelectItem disabled={true} value="b">
              Unavailable
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
};
