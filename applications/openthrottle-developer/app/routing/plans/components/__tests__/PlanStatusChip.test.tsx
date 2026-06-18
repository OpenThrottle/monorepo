import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PlanStatusChip } from '../PlanStatusChip';

describe('PlanStatusChip Component', () => {
  test('renders a labelled dot for a known status', () => {
    const component = render(<PlanStatusChip status="IN_PROGRESS" />);
    const chip = component.getByTestId('PlanStatusChip');

    expect(chip).toHaveAttribute('title', 'In Progress');
    expect(chip).toHaveAttribute('aria-label', 'Status: In Progress');
    expect(chip).toHaveClass('bg-yellow-500');
  });

  test('falls back to a neutral dot and raw label for an unknown status', () => {
    const component = render(<PlanStatusChip status="MYSTERY" />);
    const chip = component.getByTestId('PlanStatusChip');

    expect(chip).toHaveAttribute('title', 'MYSTERY');
    expect(chip).toHaveClass('bg-muted-foreground/50');
  });
});
