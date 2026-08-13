import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { SettingsSetupInstallNotice } from '../SettingsSetupInstallNotice';

describe('SettingsSetupInstallNotice', () => {
  test('warns and explains the env flag when install is disabled', () => {
    const component = render(
      <SettingsSetupInstallNotice installEnabled={false} />,
    );
    expect(
      component.getByText(/OT_AGENT_CLI_INSTALL_ENABLED/),
    ).toBeInTheDocument();
  });

  test('shows an informational note (still naming the flag) when install is enabled', () => {
    const component = render(
      <SettingsSetupInstallNotice installEnabled={true} />,
    );
    expect(
      component.getByText(/OT_AGENT_CLI_INSTALL_ENABLED/),
    ).toBeInTheDocument();
  });
});
