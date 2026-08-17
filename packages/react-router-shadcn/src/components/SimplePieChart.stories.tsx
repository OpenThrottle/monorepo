import type { Meta, StoryObj } from '@storybook/react-vite';
import { BUILD_STATUS, type StatusSlice } from './chart-fixtures.stories-data';
import { SimplePieChart } from './SimplePieChart';

/**
 * Naming the instantiated type keeps the args strongly typed; the plain
 * `satisfies Meta<typeof SimplePieChart>` form collapses the row generic to its
 * default and rejects the fixture.
 */
type SimplePieChartStory = typeof SimplePieChart<StatusSlice>;

const meta: Meta<SimplePieChartStory> = {
  args: {
    data: BUILD_STATUS,
    nameKey: 'status',
    valueKey: 'count',
    valueLabel: 'Builds',
  },
  component: SimplePieChart,
  title: 'Components/SimplePieChart',
};

export default meta;

type Story = StoryObj<SimplePieChartStory>;

/** `variant` defaults to `donut`; slice colors come from the chart tokens. */
export const Default: Story = {
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimplePieChart {...args} />
    </div>
  ),
};

export const Pie: Story = {
  args: { variant: 'pie' },
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimplePieChart {...args} />
    </div>
  ),
};

/** `innerRadiusRatio` widens or narrows the donut hole. */
export const ThinDonut: Story = {
  args: { innerRadiusRatio: 0.75 },
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimplePieChart {...args} />
    </div>
  ),
};

export const EmptyData: Story = {
  args: { data: [] },
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimplePieChart {...args} />
    </div>
  ),
};
