import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DatePicker } from '../DatePicker';

describe('DatePicker', () => {
  it('renders trigger button with placeholder when no value', () => {
    const { container } = render(<DatePicker placeholder="Pick a date" />);
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Pick a date');
  });

  it('renders trigger with formatted date when value is set', () => {
    const date = new Date(2026, 1, 6); // Feb 6, 2026
    const { container } = render(<DatePicker value={date} />);
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('February 6, 2026');
  });

  it('opens popover when trigger is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<DatePicker placeholder="Pick a date" />);
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    await user.click(trigger as HTMLButtonElement);
    const calendar = container.ownerDocument.querySelector(
      '[data-slot="calendar"]',
    );
    expect(calendar).toBeInTheDocument();
  });

  it('calls onSelect when a day is selected', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(
      <DatePicker onSelect={onSelect} placeholder="Pick a date" />,
    );
    const trigger = container.querySelector('button');
    await user.click(trigger as HTMLButtonElement);
    const dayButtons =
      container.ownerDocument.querySelectorAll('button[data-day]');
    const firstDay = dayButtons[0];
    if (firstDay) {
      await user.click(firstDay as HTMLButtonElement);
      expect(onSelect).toHaveBeenCalledWith(expect.any(Date));
    }
  });

  it('respects disabled prop', () => {
    const { container } = render(
      <DatePicker disabled={true} placeholder="Pick a date" />,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeDisabled();
  });
});
