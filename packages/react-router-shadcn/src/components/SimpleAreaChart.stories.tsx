import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BUILD_DURATIONS,
  type BuildPoint,
} from './chart-fixtures.stories-data';
import { SimpleAreaChart } from './SimpleAreaChart';

/**
 * Naming the instantiated type keeps the args strongly typed; the plain
 * `satisfies Meta<typeof SimpleAreaChart>` form collapses the row generic to its
 * default and rejects the fixture.
 */
type SimpleAreaChartStory = typeof SimpleAreaChart<BuildPoint>;

const meta: Meta<SimpleAreaChartStory> = {
  args: {
    categoryKey: 'month',
    data: BUILD_DURATIONS,
    valueKey: 'duration',
    valueLabel: 'Duration (s)',
  },
  component: SimpleAreaChart,
  title: 'Components/SimpleAreaChart',
};

export default meta;

type Story = StoryObj<SimpleAreaChartStory>;

export const Default: Story = {
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimpleAreaChart {...args} />
    </div>
  ),
};

/** `fillOpacity` controls how solid the area beneath the line reads. */
export const SolidFill: Story = {
  args: { fillOpacity: 0.6 },
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimpleAreaChart {...args} />
    </div>
  ),
};

export const LinearCurve: Story = {
  args: { curveType: 'linear' },
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimpleAreaChart {...args} />
    </div>
  ),
};

export const EmptyData: Story = {
  args: { data: [] },
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimpleAreaChart {...args} />
    </div>
  ),
};
