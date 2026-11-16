import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import OauthConsent from '../oauth.consent';

describe('routes/oauth.consent.tsx', () => {
  test('renders the consent card for a pending request', async () => {
    const Stub = createRoutesStub([
      {
        Component: OauthConsent,
        loader: () => ({
          consentRequest: {
            __typename: 'OAuthAuthorizationRequestObject',
            clientHost: 'claude.ai',
            clientName: 'Claude Code',
            expiresAt: '2026-11-16T00:10:00.000Z',
            id: 'req-1',
            redirectHost: '127.0.0.1:43123',
            registrationKind: 'cimd',
            requestedScopes: ['mcp:read'],
            resource: 'https://mcp.example.com/mcp',
          },
        }),
        path: '/oauth/consent',
      },
    ]);
    const component = render(
      <Stub initialEntries={['/oauth/consent?request=req-1']} />,
    );

    expect(await component.findByTestId('ConsentCard')).toBeInTheDocument();
  });

  test('renders the unavailable state for an unknown or expired request', async () => {
    const Stub = createRoutesStub([
      {
        Component: OauthConsent,
        loader: () => ({ consentRequest: null }),
        path: '/oauth/consent',
      },
    ]);
    const component = render(
      <Stub initialEntries={['/oauth/consent?request=gone']} />,
    );

    expect(
      await component.findByTestId('ConsentUnavailable'),
    ).toBeInTheDocument();
  });
});
