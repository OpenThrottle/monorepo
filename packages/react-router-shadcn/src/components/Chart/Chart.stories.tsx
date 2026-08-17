import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { BUILD_DURATIONS } from '../chart-fixtures.stories-data';
import { ChartContainer } from './ChartContainer';
import { ChartLegend } from './ChartLegend';
import { ChartLegendContent } from './ChartLegendContent';
import { ChartTooltip } from './ChartTooltip';
import { ChartTooltipContent } from './ChartTooltipContent';
import type { ChartConfig } from '../chart-config';

/**
 * `Chart` is the low-level toolkit the `Simple*Chart` components are built on:
 * `ChartContainer` supplies config through context and publishes each series
 * colour as a `--color-{key}` CSS variable, which the Recharts children then
 * reference. Reach for it when a `Simple*Chart` cannot express the chart;
 * otherwise prefer those.
 *
 * `ChartContainer` wraps Recharts' ResponsiveContainer, which sets
 * `width/height: 100%` INLINE — so sizing it with a `className` does nothing
 * (an inline style outranks the class) and it measures to zero. It needs a
 * sized parent instead, which is what every story here wraps it in.
 */
const CONFIG: ChartConfig = {
  duration: {
    label: 'Duration (s)',
    theme: { dark: 'var(--chart-1)', light: 'var(--chart-1)' },
  },
};

const meta = {
  args: { children: <BarChart data={[]} />, config: CONFIG },
  component: ChartContainer,
  parameters: { controls: { disable: true } },
  title: 'Components/Chart',
} satisfies Meta<typeof ChartContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="h-64 w-[32rem]">
      <ChartContainer config={CONFIG}>
        <BarChart data={[...BUILD_DURATIONS]}>
          <CartesianGrid vertical={false} />
          <XAxis axisLine={false} dataKey="month" tickLine={false} />
          <Bar dataKey="duration" fill="var(--color-duration)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  ),
};

/** `ChartTooltip` + `ChartTooltipContent` read labels from the same config. */
export const WithTooltip: Story = {
  render: () => (
    <div className="h-64 w-[32rem]">
      <ChartContainer config={CONFIG}>
        <BarChart data={[...BUILD_DURATIONS]}>
          <CartesianGrid vertical={false} />
          <XAxis axisLine={false} dataKey="month" tickLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="duration" fill="var(--color-duration)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  ),
};

export const WithLegend: Story = {
  render: () => (
    <div className="h-64 w-[32rem]">
      <ChartContainer config={CONFIG}>
        <BarChart data={[...BUILD_DURATIONS]}>
          <CartesianGrid vertical={false} />
          <XAxis axisLine={false} dataKey="month" tickLine={false} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="duration" fill="var(--color-duration)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  ),
};
