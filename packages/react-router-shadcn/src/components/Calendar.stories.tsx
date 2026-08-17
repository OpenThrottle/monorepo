import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Calendar } from './Calendar';

/** Fixed so the story renders the same month every time. */
const SAMPLE_MONTH = new Date('2026-08-01T00:00:00Z');
const SAMPLE_DATE = new Date('2026-08-16T00:00:00Z');

const meta = {
  component: Calendar,
  parameters: { controls: { disable: true } },
  title: 'Components/Calendar',
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `Calendar` wraps `react-day-picker`, so its API is that library's — `mode`,
 * `selected`, `onSelect`, `defaultMonth` — plus `buttonVariant` for the nav
 * buttons.
 */
export const Default: Story = {
  render: () => (
    <Calendar
      className="rounded-md border"
      defaultMonth={SAMPLE_MONTH}
      mode="single"
    />
  ),
};

export const WithSelection: Story = {
  render: () => (
    <Calendar
      className="rounded-md border"
      defaultMonth={SAMPLE_MONTH}
      mode="single"
      selected={SAMPLE_DATE}
    />
  ),
};

/** `mode="range"` selects a span rather than a single day. */
export const RangeMode: Story = {
  render: () => (
    <Calendar
      className="rounded-md border"
      defaultMonth={SAMPLE_MONTH}
      mode="range"
      selected={{
        from: SAMPLE_DATE,
        to: new Date('2026-08-22T00:00:00Z'),
      }}
    />
  ),
};

/** Two months side by side — the shape a range picker usually ships in. */
export const TwoMonths: Story = {
  render: () => (
    <Calendar
      className="rounded-md border"
      defaultMonth={SAMPLE_MONTH}
      mode="single"
      numberOfMonths={2}
    />
  ),
};
