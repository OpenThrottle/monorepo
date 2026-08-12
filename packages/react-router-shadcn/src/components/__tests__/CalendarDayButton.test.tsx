import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Calendar } from '../Calendar';
import { CalendarDayButton } from '../CalendarDayButton';

describe('CalendarDayButton', () => {
  test('is used to render the calendar day buttons', () => {
    expect(CalendarDayButton).toBeDefined();
    const { container } = render(
      <Calendar defaultMonth={new Date(2024, 0, 1)} mode="single" />,
    );
    const dayButtons = container.querySelectorAll('button[data-day]');
    expect(dayButtons.length).toBeGreaterThan(0);
  });
});
