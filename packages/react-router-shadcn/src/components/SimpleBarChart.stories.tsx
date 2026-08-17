import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BUILD_DURATIONS,
  type BuildPoint,
} from './chart-fixtures.stories-data';
import { SimpleBarChart } from './SimpleBarChart';

/**
 * Recharts measures its container to lay out, which jsdom cannot do — the
 * package's unit tests can assert props but never geometry. The workbench is
 * therefore the only place these charts are genuinely verifiable, so each story
 * gives the chart an explicit height.
 *
 * Naming the instantiated type keeps the args strongly typed; the plain
 * `satisfies Meta<typeof SimpleBarChart>` form collapses the row generic to its
 * default and rejects the fixture.
 */
type SimpleBarChartStory = typeof SimpleBarChart<BuildPoint>;

/**
 * ⚠️ KNOWN ISSUE (found via this story, recharts 3.10.1)
 *
 * The bar shapes do not draw. Recharts emits one
 * `.recharts-bar-rectangle` group per datum, each containing an empty
 * `.recharts-inactive-bar` group and no `rect`/`path` — so the axes, grid and
 * tooltip all render correctly but the bars themselves are invisible.
 * `SimplePieChart` fails the same way; `SimpleLineChart` and `SimpleAreaChart`
 * render fine.
 *
 * The story is correct — this is a defect in the component or the library, not
 * in the story. jsdom cannot exercise Recharts geometry, so the package's unit
 * tests cannot catch it; the workbench is the only place it is visible. Root
 * cause (version regression vs. component misuse) is not yet established.
 */
const meta: Meta<SimpleBarChartStory> = {
  args: {
    categoryKey: 'month',
    data: BUILD_DURATIONS,
    valueKey: 'duration',
    valueLabel: 'Duration (s)',
  },
  component: SimpleBarChart,
  title: 'Components/SimpleBarChart',
};

export default meta;

type Story = StoryObj<SimpleBarChartStory>;

export const Default: Story = {
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimpleBarChart {...args} />
    </div>
  ),
};

/** `layout="vertical"` turns the bars into rows. */
export const Vertical: Story = {
  args: { layout: 'vertical' },
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimpleBarChart {...args} />
    </div>
  ),
};

/** `color` accepts any CSS color, including a theme token. */
export const CustomColor: Story = {
  args: { color: 'var(--chart-2)' },
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimpleBarChart {...args} />
    </div>
  ),
};

export const EmptyData: Story = {
  args: { data: [] },
  render: (args) => (
    <div className="h-64 w-[32rem]">
      <SimpleBarChart {...args} />
    </div>
  ),
};
