import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { SettingsLogsIntroduction } from '../SettingsLogsIntroduction';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('SettingsLogsIntroduction Component', () => {
  test('renders introduction placeholder', () => {
    renderRoutesStub(<SettingsLogsIntroduction />);

    expect(screen.getByTestId('SettingsLogsIntroduction')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'SettingsLogsIntroduction' }),
    ).toBeInTheDocument();
  });
});
