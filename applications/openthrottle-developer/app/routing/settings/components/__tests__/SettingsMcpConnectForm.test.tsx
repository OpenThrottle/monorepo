import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import type { McpConnectorFieldsFragment } from '~/__generated__/graphql';
import { SettingsMcpConnectForm } from '../SettingsMcpConnectForm';
import type { SettingsMcpConnectFormProps } from '../SettingsMcpConnectForm';

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

const oauthConnector: McpConnectorFieldsFragment = {
  ...stripeConnector,
  authType: 'oauth',
  key: 'github',
  name: 'GitHub',
};

describe('SettingsMcpConnectForm Component', () => {
  let component: RenderResult;
  let props: SettingsMcpConnectFormProps;

  const renderForm = (): RenderResult => {
    component?.unmount();
    const RoutesStub = createRoutesStub([
      {
        Component: () => <SettingsMcpConnectForm {...props} />,
        action: () => null,
        path: '/',
      },
    ]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      actionError: null,
      connector: stripeConnector,
      isConnected: false,
    };

    component = renderForm();
  });

  test('renders the api-token fields and Connect label when not connected', () => {
    expect(component.getByTestId('SettingsMcpConnectForm')).toBeInTheDocument();
    expect(
      component.getByText('Connect', { selector: '[data-slot="card-title"]' }),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsMcpConnectForm-token'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsMcpConnectForm-label'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsMcpConnectForm-submit'),
    ).toHaveTextContent('Connect');
  });

  test('shows "Update token" as the submit label when already connected with api token', () => {
    props = { ...props, isConnected: true };
    component = renderForm();

    expect(
      component.getByTestId('SettingsMcpConnectForm-submit'),
    ).toHaveTextContent('Update token');
  });

  test('shows the OAuth description and no token fields for an OAuth connector', () => {
    props = { ...props, connector: oauthConnector };
    component = renderForm();

    expect(component.queryByTestId('SettingsMcpConnectForm-token')).toBeNull();
    expect(component.getByText(/OAuth handshake/)).toBeInTheDocument();
  });

  test('shows "Reconnect" as the submit label for a connected OAuth connector', () => {
    props = { ...props, connector: oauthConnector, isConnected: true };
    component = renderForm();

    expect(
      component.getByTestId('SettingsMcpConnectForm-submit'),
    ).toHaveTextContent('Reconnect');
  });

  test('renders the actionError when present', () => {
    props = { ...props, actionError: 'Something went wrong' };
    component = renderForm();

    expect(
      component.getByTestId('SettingsMcpConnectForm-error'),
    ).toHaveTextContent('Something went wrong');
  });
});
