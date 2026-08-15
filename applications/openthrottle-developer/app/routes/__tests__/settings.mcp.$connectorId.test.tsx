import * as React from 'react';
import { render, within } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { createActionArgs } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Component, { action } from '../settings.mcp.$connectorId';
import {
  ConnectMcpConnectorDocument,
  DisconnectMcpConnectorDocument,
  SetMcpConnectorEnabledDocument,
} from '~/__generated__/graphql';
import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/settings.mcp.$connectorId';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});
const mockExec = vi.mocked(graphqlWithAuth.executeGraphqlWithAuth);

const stripeConnector: McpConnectorFieldsFragment = {
  __typename: 'McpConnectorObject',
  authType: 'api_token',
  category: 'Payments',
  description: 'Stripe payments.',
  docsUrl: 'https://docs.stripe.com/mcp',
  endpointUrl: 'https://mcp.stripe.com',
  iconHint: 'stripe',
  key: 'stripe',
  name: 'Stripe',
  provider: 'vendor-remote',
  transport: 'remote-http',
};

const stripeConnection: McpConnectorConnectionFieldsFragment = {
  __typename: 'McpConnectorConnectionObject',
  authType: 'api_token',
  connectedAt: '2026-02-02T10:00:00.000Z',
  connectorKey: 'stripe',
  credentialLabel: 'prod',
  credentialPrefix: 'sk_l…cdef',
  enabled: true,
  id: '11111111-1111-4111-8111-111111111111',
  lastUsedAt: null,
};

const renderRoute = (loaderData: {
  connection: McpConnectorConnectionFieldsFragment | null;
  connector: McpConnectorFieldsFragment | null;
}) => {
  const Stub = createRoutesStub([
    {
      Component,
      loader: () => loaderData,
      path: '/settings/mcp/:connectorId',
    },
  ]);
  return render(<Stub initialEntries={['/settings/mcp/stripe']} />);
};

describe('routes/settings.mcp.$connectorId — action', () => {
  beforeEach(() => {
    mockExec.mockReset();
  });

  test('connect posts the api token and returns the connection', async () => {
    mockExec.mockResolvedValue({
      connectMcpConnector: { connection: stripeConnection },
    });

    const result = await action(
      createActionArgs<Route.ActionArgs>({
        body: {
          apiToken: 'sk_live_x',
          connectorKey: 'stripe',
          intent: 'connect',
        },
        params: { connectorId: 'stripe' },
      }),
    );

    expect(mockExec).toHaveBeenCalledWith(
      expect.any(Request),
      ConnectMcpConnectorDocument,
      { input: { apiToken: 'sk_live_x', connectorKey: 'stripe', label: null } },
    );
    expect(result).toStrictEqual({
      connection: stripeConnection,
      intent: 'connect',
    });
  });

  test('setEnabled posts the flag', async () => {
    mockExec.mockResolvedValue({ setMcpConnectorEnabled: null });

    const result = await action(
      createActionArgs<Route.ActionArgs>({
        body: {
          connectorKey: 'stripe',
          enabled: 'false',
          intent: 'setEnabled',
        },
        params: { connectorId: 'stripe' },
      }),
    );

    expect(mockExec).toHaveBeenCalledWith(
      expect.any(Request),
      SetMcpConnectorEnabledDocument,
      { input: { connectorKey: 'stripe', enabled: false } },
    );
    expect(result).toStrictEqual({ ok: true });
  });

  test('disconnect posts the connector key', async () => {
    mockExec.mockResolvedValue({ disconnectMcpConnector: true });

    const result = await action(
      createActionArgs<Route.ActionArgs>({
        body: { connectorKey: 'stripe', intent: 'disconnect' },
        params: { connectorId: 'stripe' },
      }),
    );

    expect(mockExec).toHaveBeenCalledWith(
      expect.any(Request),
      DisconnectMcpConnectorDocument,
      { connectorKey: 'stripe' },
    );
    expect(result).toStrictEqual({ ok: true });
  });

  test('returns an error when the connector key is missing', async () => {
    const result = await action(
      createActionArgs<Route.ActionArgs>({
        body: { intent: 'connect' },
        params: { connectorId: 'stripe' },
      }),
    );
    expect(result).toStrictEqual({ error: 'Connector is required.' });
    expect(mockExec).not.toHaveBeenCalled();
  });

  test('surfaces a graphql error as an action error', async () => {
    mockExec.mockRejectedValue(new Error('boom'));

    const result = await action(
      createActionArgs<Route.ActionArgs>({
        body: { connectorKey: 'stripe', intent: 'disconnect' },
        params: { connectorId: 'stripe' },
      }),
    );
    expect(result).toStrictEqual({ error: 'boom' });
  });

  test('throws on an unknown intent', async () => {
    await expect(
      action(
        createActionArgs<Route.ActionArgs>({
          body: { connectorKey: 'stripe', intent: 'nope' },
          params: { connectorId: 'stripe' },
        }),
      ),
    ).rejects.toThrow('Invalid intent');
  });
});

describe('routes/settings.mcp.$connectorId — render', () => {
  test('shows setup docs and a token connect form when disconnected', async () => {
    const component = renderRoute({
      connection: null,
      connector: stripeConnector,
    });

    expect(
      await component.findByTestId('SettingsMcpSetupDocs'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsMcpConnectForm-token'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('SettingsMcpConnectionActions'),
    ).not.toBeInTheDocument();
  });

  test('shows connection actions (disable + disconnect) when connected', async () => {
    const component = renderRoute({
      connection: stripeConnection,
      connector: stripeConnector,
    });

    const actions = await component.findByTestId(
      'SettingsMcpConnectionActions',
    );
    expect(within(actions).getByText('Disable')).toBeInTheDocument();
    expect(
      within(actions).getByTestId('SettingsMcpConnectionActions-disconnect'),
    ).toBeInTheDocument();
  });

  test('renders an unknown-connector fallback', async () => {
    const component = renderRoute({ connection: null, connector: null });
    expect(
      await component.findByText('Unknown connector.'),
    ).toBeInTheDocument();
  });
});
