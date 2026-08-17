import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatePicker } from './DatePicker';

/**
 * A fixed date keeps the story deterministic — `new Date()` would make every
 * render differ and any future snapshot churn.
 */
const SAMPLE_DATE = new Date('2026-08-16T00:00:00Z');

const ControlledDatePicker = (
  props: Omit<React.ComponentProps<typeof DatePicker>, 'onSelect' | 'value'> & {
    readonly initialValue?: Date;
  },
): React.ReactElement => {
  const { initialValue, ...rest } = props;

  // Hooks
  const [value, setValue] = React.useState<Date | undefined>(initialValue);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="w-64">
      <DatePicker {...rest} onSelect={setValue} value={value} />
    </div>
  );
};

const meta = {
  component: DatePicker,
  parameters: { controls: { disable: true } },
  title: 'Components/DatePicker',
} satisfies Meta<typeof DatePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Click the trigger to open the calendar popover. */
export const Default: Story = {
  render: () => <ControlledDatePicker placeholder="Pick a date" />,
};

export const WithValue: Story = {
  render: () => <ControlledDatePicker initialValue={SAMPLE_DATE} />,
};

export const Disabled: Story = {
  render: () => (
    <ControlledDatePicker disabled={true} placeholder="Unavailable" />
  ),
};
