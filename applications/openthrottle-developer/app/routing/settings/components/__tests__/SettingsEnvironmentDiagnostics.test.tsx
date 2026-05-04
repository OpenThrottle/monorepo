import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OpenThrottleEnv } from '@openthrottle/react-router-utils';
import { SettingsEnvironmentDiagnostics } from '../SettingsEnvironmentDiagnostics';

const baseEnv: OpenThrottleEnv = {
  API_URL_EXTERNAL: 'http://api-ext.test',
  API_URL_INTERNAL: 'http://api-int.test',
  APP_ENV: 'development',
  APP_NAME: 'openthrottle-developer',
  APP_URL: 'http://localhost:6020',
  APP_URL_ADMIN: 'http://localhost:6022',
  APP_URL_CMS: 'http://localhost:6023',
  APP_URL_DEVELOPER: 'http://localhost:6020',
  APP_URL_EMAIL: 'http://localhost:6024',
  APP_URL_SERVER: 'http://localhost:6021',
  APP_URL_WEBSITE: 'http://localhost:6025',
  APP_VERSION: 'test-version',
  NODE_ENV: 'development',
  ROLLBAR_TOKEN: 'rollbar-test-token',
};

describe('SettingsEnvironmentDiagnostics', () => {
  it('renders build metadata and URL matrix', () => {
    render(
      <SettingsEnvironmentDiagnostics
        env={baseEnv}
        supportBundle={{ ROLLBAR_TOKEN: 'xxxx…xxxx (masked)' }}
      />,
    );

    expect(screen.getByText('openthrottle-developer')).toBeInTheDocument();
    expect(screen.getByText('test-version')).toBeInTheDocument();
    expect(screen.getByText('http://api-int.test')).toBeInTheDocument();
    expect(screen.getByText('http://localhost:6022')).toBeInTheDocument();
  });

  it('copies support bundle JSON to clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const supportBundle = { APP_NAME: 'openthrottle-developer' };

    render(
      <SettingsEnvironmentDiagnostics
        env={baseEnv}
        supportBundle={supportBundle}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /copy support bundle/i }),
    );

    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify(supportBundle, null, 2),
    );
  });

  it('includes API and app URL keys in the matrix table', () => {
    const { container } = render(
      <SettingsEnvironmentDiagnostics env={baseEnv} supportBundle={{}} />,
    );

    const table = container.querySelector('table');
    expect(table).toBeTruthy();
    if (!table) return;
    expect(within(table).getByText('API_URL_INTERNAL')).toBeInTheDocument();
    expect(within(table).getByText('APP_URL_DEVELOPER')).toBeInTheDocument();
  });
});
