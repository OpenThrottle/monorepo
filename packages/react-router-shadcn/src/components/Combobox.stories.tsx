import * as React from 'react';
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

/**
 * Options may carry a muted `hint` — used here for the invocation count that
 * the /usage branch filter shows beside each branch.
 */
export const WithHints: Story = {
  args: {
    options: [
      { hint: '412', label: 'main', value: 'main' },
      { hint: '38', label: 'feat/usage-branch-filter', value: 'feat/usage' },
      { hint: '4', label: 'release/4.8', value: 'release/4.8' },
    ],
    placeholder: 'All branches',
  },
  render: (args) => (
    <div className="w-64">
      <Combobox {...args} />
    </div>
  ),
};

/**
 * Async mode: the caller owns the search string and the option list, so cmdk
 * must not re-filter what the server already narrowed. Pass `onSearchChange` +
 * `searchValue` + `shouldFilter={false}`, and `loading` while a request is in
 * flight so the empty state never flashes.
 */
export const AsyncSearch: Story = {
  render: (args) => {
    const [search, setSearch] = React.useState('');
    const matches = REGIONS.filter((region) =>
      region.label.includes(search.trim()),
    );

    return (
      <div className="w-64">
        <Combobox
          {...args}
          footer={
            <div className="text-muted-foreground border-t px-3 py-2 text-xs">
              Showing the first {matches.length} — keep typing to narrow.
            </div>
          }
          onSearchChange={setSearch}
          options={matches}
          searchPlaceholder="Search regions…"
          searchValue={search}
          shouldFilter={false}
        />
      </div>
    );
  },
};

/** `loading` stands in for the empty state while a search is in flight. */
export const AsyncLoading: Story = {
  args: {
    loading: true,
    options: [],
    searchValue: 'us-',
    shouldFilter: false,
  },
  render: (args) => (
    <div className="w-64">
      <Combobox {...args} />
    </div>
  ),
};
