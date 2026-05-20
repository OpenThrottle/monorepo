import * as React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { SettingsDebugPanel } from '../SettingsDebugPanel';
import type { SettingsDebugGraphQLResult } from '../SettingsDebugPanel';
import { renderRoutesStub } from '~/testing/route-fixtures';

const envSnapshot = {
  APP_NAME: 'openthrottle-developer',
};

const graphQLOk: SettingsDebugGraphQLResult = {
  latencyMs: 42,
  serverHealth: {
    api: 'ok',
    database: 'ok',
    redis: 'ok',
    websocket: 'ok',
  },
  status: 'ok',
};

const graphQLError: SettingsDebugGraphQLResult = {
  error: 'Connection refused',
  latencyMs: 12,
  status: 'error',
};

describe('SettingsDebugPanel', () => {
  test('renders debug sections when GraphQL health is ok', () => {
    renderRoutesStub(
      <SettingsDebugPanel envSnapshot={envSnapshot} graphQL={graphQLOk} />,
    );

    expect(screen.getByRole('heading', { name: 'Debug' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Feature flags' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sanitized env snapshot')).toBeInTheDocument();
    expect(screen.getByText('GraphQL endpoint health')).toBeInTheDocument();
    expect(screen.getByText(/getRootHealth/i)).toBeInTheDocument();
    expect(screen.getByText(/42 ms/)).toBeInTheDocument();
    expect(screen.getByText(/local dev: ports, hosts/i)).toBeInTheDocument();
  });

  test('renders GraphQL error details when health check fails', () => {
    renderRoutesStub(
      <SettingsDebugPanel envSnapshot={envSnapshot} graphQL={graphQLError} />,
    );

    expect(screen.getByText(/request failed/i)).toBeInTheDocument();
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
    expect(screen.getByText('12 ms')).toBeInTheDocument();
  });

  test('exposes Re-check control for GraphQL health', async () => {
    const user = userEvent.setup();
    renderRoutesStub(
      <SettingsDebugPanel envSnapshot={envSnapshot} graphQL={graphQLOk} />,
    );

    const button = screen.getByRole('button', { name: 'Re-check' });
    expect(button).toBeEnabled();

    await user.click(button);

    expect(button).toBeInTheDocument();
  });
});
