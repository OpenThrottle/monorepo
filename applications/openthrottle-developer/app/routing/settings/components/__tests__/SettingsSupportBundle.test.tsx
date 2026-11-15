import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import { SettingsSupportBundle } from '../SettingsSupportBundle';

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
    const component = renderRoutesStub(<SettingsSupportBundle />);

    expect(component.getByText('Support bundle')).toBeInTheDocument();
    expect(component.getByText(/sanitized/i)).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Copy bundle JSON' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Download bundle JSON' }),
    ).toBeInTheDocument();
  });

  test('shows success toast when Copy bundle JSON is clicked', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const component = renderRoutesStub(<SettingsSupportBundle />);

    await user.click(
      component.getByRole('button', { name: 'Copy bundle JSON' }),
    );

    expect(writeText).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith(
      'Support bundle copied to clipboard',
    );
  });
});
