import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MultiSelect } from './MultiSelect';

const LABELS = [
  { label: 'bug', value: 'bug' },
  { label: 'documentation', value: 'documentation' },
  { label: 'enhancement', value: 'enhancement' },
  { label: 'good first issue', value: 'good-first-issue' },
];

/**
 * `MultiSelect` is fully controlled — `value` and `onChange` are both required —
 * so the stories hold state rather than passing a static array. Without this the
 * component would render but never respond to a click.
 */
const ControlledMultiSelect = (
  props: Omit<
    React.ComponentProps<typeof MultiSelect>,
    'onChange' | 'value'
  > & {
    readonly initialValue?: readonly string[];
  },
): React.ReactElement => {
  const { initialValue = [], ...rest } = props;

  // Hooks
  const [value, setValue] = React.useState<readonly string[]>(initialValue);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="w-72">
      <MultiSelect {...rest} onChange={setValue} value={value} />
    </div>
  );
};

/**
 * `value` and `onChange` are required props, so `meta.args` has to satisfy them
 * even though every story drives real state through the wrapper above and
 * ignores these. Without them each story would fail to typecheck.
 */
const meta = {
  args: { onChange: () => undefined, options: LABELS, value: [] },
  component: MultiSelect,
  parameters: { controls: { disable: true } },
  title: 'Components/MultiSelect',
} satisfies Meta<typeof MultiSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ControlledMultiSelect options={LABELS} placeholder="Add labels" />
  ),
};

export const WithSelection: Story = {
  render: () => (
    <ControlledMultiSelect
      initialValue={['bug', 'enhancement']}
      options={LABELS}
    />
  ),
};

export const CustomEmptyText: Story = {
  render: () => (
    <ControlledMultiSelect
      emptyText="No label matches that name."
      options={LABELS}
      searchPlaceholder="Filter labels…"
    />
  ),
};
