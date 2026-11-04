import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';

import { cn } from '../utils/cn';
import type { FacetedFilterOption } from './FacetedFilter';
import { FacetedFilter } from './FacetedFilter';

const Dot = (props: { readonly className: string }): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <span
      aria-hidden={true}
      className={cn('size-2 shrink-0 rounded-full', className)}
    />
  );
};

const option = (
  value: string,
  label: string,
  group: string,
  dot: string,
  count: number | undefined,
): FacetedFilterOption => ({
  adornment: <Dot className={dot} />,
  count,
  group,
  label,
  value,
});

const STATUSES: readonly FacetedFilterOption[] = [
  option('BACKLOG', 'Backlog', 'Active', 'bg-violet-500', undefined),
  option('PENDING', 'Pending', 'Active', 'bg-sky-500', undefined),
  option('QUEUED', 'Queued', 'Active', 'bg-amber-500', undefined),
  option('IN_PROGRESS', 'In Progress', 'Active', 'bg-yellow-500', undefined),
  option('BLOCKED', 'Blocked', 'Active', 'bg-red-500', undefined),
  option('COMPLETED', 'Completed', 'Resolved', 'bg-lime-500', undefined),
  option('PROMOTED', 'Promoted', 'Resolved', 'bg-blue-500', undefined),
  option('CANCELED', 'Canceled', 'Resolved', 'bg-slate-500', undefined),
  option('SKIPPED', 'Skipped', 'Resolved', 'bg-teal-500', undefined),
];

const WITH_COUNTS: readonly FacetedFilterOption[] = STATUSES.map(
  (status, index) => ({ ...status, count: (index + 1) * 3 }),
);

const DEFAULTS: readonly string[] = [
  'BACKLOG',
  'PENDING',
  'QUEUED',
  'IN_PROGRESS',
];

/**
 * `FacetedFilter` is fully controlled, so the stories hold state and wire the
 * Reset / All footer actions the way a consuming toolbar would.
 */
const ControlledFacetedFilter = (props: {
  readonly initialValue: readonly string[];
  readonly options: readonly FacetedFilterOption[];
  readonly searchable: boolean;
}): React.ReactElement => {
  const { initialValue, options, searchable } = props;

  // Hooks
  const [value, setValue] = React.useState<readonly string[]>(initialValue);

  // Setup
  const atDefaults =
    value.length === DEFAULTS.length &&
    DEFAULTS.every((v) => value.includes(v));
  const atAll = value.length === 0 || value.length === options.length;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <FacetedFilter
      footerActions={[
        {
          disabled: atDefaults,
          label: 'Reset to defaults',
          onSelect: () => setValue(DEFAULTS),
        },
        {
          disabled: atAll,
          label: 'All statuses',
          onSelect: () => setValue(options.map((o) => o.value)),
        },
      ]}
      maxBadges={2}
      onChange={setValue}
      options={options}
      searchable={searchable}
      title="Status"
      value={value}
    />
  );
};

const meta = {
  args: {
    footerActions: [],
    maxBadges: 2,
    onChange: () => undefined,
    options: STATUSES,
    searchable: false,
    title: 'Status',
    value: [],
  },
  component: FacetedFilter,
  parameters: { controls: { disable: true } },
  title: 'Components/FacetedFilter',
} satisfies Meta<typeof FacetedFilter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ControlledFacetedFilter
      initialValue={['IN_PROGRESS', 'QUEUED']}
      options={STATUSES}
      searchable={false}
    />
  ),
};

export const Collapsed: Story = {
  render: () => (
    <ControlledFacetedFilter
      initialValue={DEFAULTS}
      options={STATUSES}
      searchable={false}
    />
  ),
};

export const SearchableWithCounts: Story = {
  render: () => (
    <ControlledFacetedFilter
      initialValue={[]}
      options={WITH_COUNTS}
      searchable={true}
    />
  ),
};
