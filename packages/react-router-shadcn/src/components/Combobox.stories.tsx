import type { Meta, StoryObj } from '@storybook/react-vite';
import { Combobox } from './Combobox';

const REGIONS = [
  { label: 'us-east-1', value: 'us-east-1' },
  { label: 'us-west-2', value: 'us-west-2' },
  { label: 'eu-west-1', value: 'eu-west-1' },
  { label: 'eu-central-1', value: 'eu-central-1' },
  { label: 'ap-southeast-2', value: 'ap-southeast-2' },
];

const meta = {
  args: { options: REGIONS, placeholder: 'Select a region' },
  component: Combobox,
  title: 'Components/Combobox',
} satisfies Meta<typeof Combobox>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A searchable single-select. Click the trigger to open and type to filter. */
export const Default: Story = {
  render: (args) => (
    <div className="w-64">
      <Combobox {...args} />
    </div>
  ),
};

/**
 * `options` also accepts a plain string array — the value and label are then
 * the same string.
 */
export const StringOptions: Story = {
  args: { options: ['main', 'develop', 'release/4.8'] },
  render: (args) => (
    <div className="w-64">
      <Combobox {...args} />
    </div>
  ),
};

export const WithValue: Story = {
  args: { value: 'eu-west-1' },
  render: (args) => (
    <div className="w-64">
      <Combobox {...args} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <div className="w-64">
      <Combobox {...args} />
    </div>
  ),
};

/** `emptyText` is what shows when a search matches nothing. */
export const CustomEmptyText: Story = {
  args: { emptyText: 'No region matches that name.' },
  render: (args) => (
    <div className="w-64">
      <Combobox {...args} />
    </div>
  ),
};
