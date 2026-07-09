import * as React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { UsageSnapshot } from '../UsageSnapshot';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

const { toastSuccess } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: toastSuccess,
  }),
}));

const dailyStats: ReadonlyArray<DashboardDailyStatsCardFragment> = [
  {
    date: '2026-01-15',
    plansCompleted: 1,
    plansCreated: 0,
    plansUpdated: 2,
    tasksCompleted: 0,
    tasksCreated: 1,
    tasksUpdated: 0,
  },
];

describe('UsageSnapshot Component', () => {
  beforeEach(() => {
    toastSuccess.mockClear();
  });

  test('renders export card and copy action', () => {
    renderRoutesStub(
      <UsageSnapshot
        dailyStats={dailyStats}
        rangeDays={30}
        rangeEndIso="2026-02-01T00:00:00.000Z"
        rangeStartIso="2026-01-01T00:00:00.000Z"
      />,
    );

    expect(screen.getByText('Export coarse usage data')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy usage snapshot (JSON)' }),
    ).toBeInTheDocument();
  });

  test('copies support snapshot JSON and shows success toast', async () => {
    const user = userEvent.setup();
    const writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    renderRoutesStub(
      <UsageSnapshot
        dailyStats={dailyStats}
        rangeDays={30}
        rangeEndIso="2026-02-01T00:00:00.000Z"
        rangeStartIso="2026-01-01T00:00:00.000Z"
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Copy usage snapshot (JSON)' }),
    );

    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0]?.[0];
    if (copied === undefined) {
      throw new Error('clipboard writeText was not called');
    }
    const parsed: { readonly rangeDays: number } = JSON.parse(copied);
    expect(parsed.rangeDays).toBe(30);
    expect(toastSuccess).toHaveBeenCalledWith(
      'Usage snapshot copied to clipboard',
    );
  });
});
