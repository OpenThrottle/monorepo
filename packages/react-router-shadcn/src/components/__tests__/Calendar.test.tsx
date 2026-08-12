import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Calendar } from '../Calendar';

describe('Calendar', () => {
  test('renders the calendar with its data-slot and a day grid', () => {
    const { container } = render(
      <Calendar defaultMonth={new Date(2024, 0, 1)} />,
    );
    expect(
      container.querySelector('[data-slot="calendar"]'),
    ).toBeInTheDocument();
    expect(container.querySelector('table')).toBeInTheDocument();
  });
});
