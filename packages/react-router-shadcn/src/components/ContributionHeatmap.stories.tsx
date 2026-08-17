import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ContributionHeatmap,
  type ContributionHeatmapValue,
} from './ContributionHeatmap';

const END_DATE = '2026-08-16';

/**
 * Deterministic sample data — a fixed seed rather than `Math.random()`, so the
 * heatmap renders identically every time.
 */
const VALUES: readonly ContributionHeatmapValue[] = Array.from(
  { length: 26 * 7 },
  (_value, index) => {
    const date = new Date('2026-02-22T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + index);

    return {
      count: (index * 7) % 11 === 0 ? 0 : (index * 3) % 9,
      date: date.toISOString().slice(0, 10),
    };
  },
);

const meta = {
  args: { endDate: END_DATE, values: VALUES },
  component: ContributionHeatmap,
  title: 'Components/ContributionHeatmap',
} satisfies Meta<typeof ContributionHeatmap>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A GitHub-style contribution grid. Counts are bucketed into five intensity
 * levels, so the exact number matters less than its band.
 */
export const Default: Story = {};

/** `weeks` controls how far back the grid reaches. */
export const ShortRange: Story = {
  args: { weeks: 12 },
};

/** With no values every cell sits at the empty level rather than disappearing. */
export const NoContributions: Story = {
  args: { values: [] },
};

/** `onSelectDate` makes the cells interactive. */
export const Selectable: Story = {
  args: { onSelectDate: () => undefined },
};
