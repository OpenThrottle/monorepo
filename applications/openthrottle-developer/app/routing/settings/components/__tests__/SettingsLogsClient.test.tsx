import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { SettingsLogsClient } from '../SettingsLogsClient';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('SettingsLogsClient Component', () => {
  test('renders client logs placeholder', () => {
    renderRoutesStub(<SettingsLogsClient />);

    expect(screen.getByTestId('SettingsLogsClient')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'SettingsLogsClient' }),
    ).toBeInTheDocument();
  });
});
