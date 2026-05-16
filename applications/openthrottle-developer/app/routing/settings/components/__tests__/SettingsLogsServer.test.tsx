import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { SettingsLogsServer } from '../SettingsLogsServer';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('SettingsLogsServer Component', () => {
  test('renders server logs placeholder', () => {
    renderRoutesStub(<SettingsLogsServer />);

    expect(screen.getByTestId('SettingsLogsServer')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'SettingsLogsServer' }),
    ).toBeInTheDocument();
  });
});
