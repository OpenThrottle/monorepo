import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import type { McpConnectorFieldsFragment } from '~/__generated__/graphql';
import { SettingsMcpSetupDocs } from './SettingsMcpSetupDocs';
import type { SettingsMcpSetupDocsProps } from './SettingsMcpSetupDocs';

const connector: McpConnectorFieldsFragment = {
  authType: 'api_token',
  category: 'productivity',
  description: 'Connect to Linear for issue tracking.',
  docsUrl: 'https://developers.linear.app/docs',
  endpointUrl: 'https://api.linear.app/mcp',
  iconHint: 'linear',
  key: 'linear',
  name: 'Linear',
  provider: 'linear',
  transport: 'remote-http',
};

describe('SettingsMcpSetupDocs Component', () => {
  let component: RenderResult;
  let props: SettingsMcpSetupDocsProps;

  beforeEach(() => {
    props = { connector };
    component = render(<SettingsMcpSetupDocs {...props} />);
  });

  test('renders the connector description and provider/auth/transport badges', () => {
    expect(component.getByTestId('SettingsMcpSetupDocs')).toBeInTheDocument();
    expect(
      component.getByText('Connect to Linear for issue tracking.'),
    ).toBeInTheDocument();
    expect(component.getByText('API token')).toBeInTheDocument();
    expect(component.getByText('Remote (HTTP)')).toBeInTheDocument();
  });

  test('renders the endpoint URL when provided', () => {
    expect(
      component.getByText('https://api.linear.app/mcp'),
    ).toBeInTheDocument();
  });

  test('falls back to the local/directory-brokered label when endpointUrl is null', () => {
    component.unmount();
    props = { connector: { ...connector, endpointUrl: null } };
    component = render(<SettingsMcpSetupDocs {...props} />);

    expect(
      component.getByText('Local / directory-brokered'),
    ).toBeInTheDocument();
  });

  test('links to the docs URL', () => {
    expect(component.getByTestId('SettingsMcpSetupDocs-link')).toHaveAttribute(
      'href',
      'https://developers.linear.app/docs',
    );
  });
});
