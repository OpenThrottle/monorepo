import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import type { SettingsDebugGraphQLResult } from '../SettingsDebugPanel';
import { SettingsDebugPanel } from '../SettingsDebugPanel';

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
    const component = renderRoutesStub(
      <SettingsDebugPanel envSnapshot={envSnapshot} graphQL={graphQLOk} />,
    );

    expect(
      component.getByRole('heading', { name: 'Debug' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('group', { name: 'Feature flags' }),
    ).toBeInTheDocument();
    expect(component.getByText('Sanitized env snapshot')).toBeInTheDocument();
    expect(component.getByText('GraphQL endpoint health')).toBeInTheDocument();
    expect(component.getByText(/getRootHealth/i)).toBeInTheDocument();
    expect(component.getByText(/42 ms/)).toBeInTheDocument();
    expect(component.getByText(/local dev: ports, hosts/i)).toBeInTheDocument();
  });

  test('renders GraphQL error details when health check fails', () => {
    const component = renderRoutesStub(
      <SettingsDebugPanel envSnapshot={envSnapshot} graphQL={graphQLError} />,
    );

    expect(component.getByText(/request failed/i)).toBeInTheDocument();
    expect(component.getByText('Connection refused')).toBeInTheDocument();
    expect(component.getByText('12 ms')).toBeInTheDocument();
  });

  test('exposes Re-check control for GraphQL health', async () => {
    const user = userEvent.setup();
    const component = renderRoutesStub(
      <SettingsDebugPanel envSnapshot={envSnapshot} graphQL={graphQLOk} />,
    );

    const button = component.getByRole('button', { name: 'Re-check' });
    expect(button).toBeEnabled();

    await user.click(button);

    expect(button).toBeInTheDocument();
  });
});
