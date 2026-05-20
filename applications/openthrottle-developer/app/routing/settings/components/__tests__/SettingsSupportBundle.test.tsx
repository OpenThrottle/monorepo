import * as React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SettingsSupportBundle } from '../SettingsSupportBundle';
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

describe('SettingsSupportBundle Component', () => {
  beforeEach(() => {
    toastSuccess.mockClear();
  });

  test('renders support bundle copy and action buttons', () => {
    renderRoutesStub(<SettingsSupportBundle />);

    expect(
      screen.getByRole('heading', { name: 'Support bundle' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/sanitized/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy bundle JSON' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Download bundle JSON' }),
    ).toBeInTheDocument();
  });

  test('shows success toast when Copy bundle JSON is clicked', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    renderRoutesStub(<SettingsSupportBundle />);

    await user.click(screen.getByRole('button', { name: 'Copy bundle JSON' }));

    expect(writeText).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith(
      'Support bundle copied to clipboard',
    );
  });
});
