import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BUILD_DURATIONS,
  type BuildPoint,
} from './chart-fixtures.stories-data';
import { SimpleLineChart } from './SimpleLineChart';

/**
 * Naming the instantiated type keeps the args strongly typed; the plain
 * `satisfies Meta<typeof SimpleLineChart>` form collapses the row generic to its
 * default and rejects the fixture.
 */
type SimpleLineChartStory = typeof SimpleLineChart<BuildPoint>;

const meta: Meta<SimpleLineChartStory> = {
  args: {
    categoryKey: 'month',
    data: BUILD_DURATIONS,
    valueKey: 'duration',
    valueLabel: 'Duration (s)',
  },
  component: SimpleLineChart,
  title: 'Components/SimpleLineChart',
};

export default meta;

type Story = StoryObj<SimpleLineChartStory>;

export const Default: Story = {
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimpleLineChart {...args} />
    </div>
  ),
};

/** `showDots` marks each data point. */
export const WithDots: Story = {
  args: { showDots: true },
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimpleLineChart {...args} />
    </div>
  ),
};

/** `curveType` is passed straight to Recharts — `linear` squares the joins. */
export const LinearCurve: Story = {
  args: { curveType: 'linear', showDots: true },
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimpleLineChart {...args} />
    </div>
  ),
};

export const EmptyData: Story = {
  args: { data: [] },
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimpleLineChart {...args} />
    </div>
  ),
};
