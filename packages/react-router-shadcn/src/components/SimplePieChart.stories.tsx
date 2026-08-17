import type { Meta, StoryObj } from '@storybook/react-vite';
import { BUILD_STATUS, type StatusSlice } from './chart-fixtures.stories-data';
import { SimplePieChart } from './SimplePieChart';

/**
 * Naming the instantiated type keeps the args strongly typed; the plain
 * `satisfies Meta<typeof SimplePieChart>` form collapses the row generic to its
 * default and rejects the fixture.
 */
type SimplePieChartStory = typeof SimplePieChart<StatusSlice>;

/**
 * ⚠️ KNOWN ISSUE (found via this story, recharts 3.10.1)
 *
 * The pie sectors do not draw. Recharts emits `.recharts-pie` containing an
 * empty layer and no `path`, so the chart area is blank. `SimpleBarChart`
 * fails the same way; `SimpleLineChart` and `SimpleAreaChart` render fine.
 *
 * The story is correct — this is a defect in the component or the library, not
 * in the story. jsdom cannot exercise Recharts geometry, so the package's unit
 * tests cannot catch it; the workbench is the only place it is visible. Root
 * cause (version regression vs. component misuse) is not yet established.
 */
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
