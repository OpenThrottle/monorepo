import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContributionHeatmap } from '../ContributionHeatmap';

// 2026-01-31 is a Saturday, so a grid ending on it has no future
// placeholders — every slot is a real day cell (deterministic counts).
const END_DATE = '2026-01-31';

describe('ContributionHeatmap', () => {
  it('renders an empty state when there are no values', () => {
    const { getByText, queryAllByRole } = render(
      <ContributionHeatmap values={[]} />,
    );

    expect(getByText('No contribution activity to show.')).toBeInTheDocument();
    expect(queryAllByRole('gridcell')).toHaveLength(0);
  });

  it('renders one day cell per day in the window (weeks × 7)', () => {
    const { getAllByRole } = render(
      <ContributionHeatmap
        endDate={END_DATE}
        values={[{ count: 1, date: END_DATE }]}
        weeks={4}
      />,
    );

    // 4 weeks × 7 days, ending on a Saturday → 28 real cells, no placeholders.
    expect(getAllByRole('gridcell')).toHaveLength(28);
  });

  it('buckets counts into the 5-level intensity ramp relative to the max', () => {
    const { getByLabelText } = render(
      <ContributionHeatmap
        endDate={END_DATE}
        values={[
          { count: 4, date: '2026-01-31' }, // max → level 4
          { count: 2, date: '2026-01-30' }, // ceil(2/4*4)=2 → level 2
          { count: 1, date: '2026-01-29' }, // ceil(1/4*4)=1 → level 1
        ]}
        weeks={4}
      />,
    );

    expect(getByLabelText('4 contributions on 2026-01-31')).toHaveClass(
      'bg-primary',
    );
    expect(getByLabelText('2 contributions on 2026-01-30')).toHaveClass(
      'bg-primary/45',
    );
    expect(getByLabelText('1 contribution on 2026-01-29')).toHaveClass(
      'bg-primary/25',
    );
    // A day with no value falls to the empty level.
    expect(getByLabelText('0 contributions on 2026-01-28')).toHaveClass(
      'bg-muted',
    );
  });

  it('fires onSelectDate with the cell date on click', async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    const { getByLabelText } = render(
      <ContributionHeatmap
        endDate={END_DATE}
        onSelectDate={onSelectDate}
        values={[{ count: 3, date: '2026-01-30' }]}
        weeks={4}
      />,
    );

    await user.click(getByLabelText('3 contributions on 2026-01-30'));

    expect(onSelectDate).toHaveBeenCalledWith('2026-01-30');
  });

  it('activates a cell via the keyboard (Enter)', async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    const { getByLabelText } = render(
      <ContributionHeatmap
        endDate={END_DATE}
        onSelectDate={onSelectDate}
        values={[{ count: 3, date: '2026-01-30' }]}
        weeks={4}
      />,
    );

    getByLabelText('3 contributions on 2026-01-30').focus();
    await user.keyboard('{Enter}');

    expect(onSelectDate).toHaveBeenCalledWith('2026-01-30');
  });

  it('disables cells when no onSelectDate is provided', () => {
    const { getByLabelText } = render(
      <ContributionHeatmap
        endDate={END_DATE}
        values={[{ count: 3, date: '2026-01-30' }]}
        weeks={4}
      />,
    );

    expect(getByLabelText('3 contributions on 2026-01-30')).toBeDisabled();
  });
});
