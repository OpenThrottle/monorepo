import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { OAUTH_CONSENT_COPY } from '~/routing/oauth/data/data.copy';

import type { ConsentCardProps } from '../ConsentCard';
import { ConsentCard } from '../ConsentCard';

const baseRequest: ConsentCardProps['request'] = {
  __typename: 'OAuthAuthorizationRequestObject',
  clientHost: 'claude.ai',
  clientName: 'Claude Code',
  expiresAt: '2026-11-16T00:10:00.000Z',
  id: 'req-1',
  redirectHost: '127.0.0.1:43123',
  registrationKind: 'cimd',
  requestedScopes: ['mcp:read', 'mcp:write'],
  resource: 'https://mcp.example.com/mcp',
};

const renderCard = (overrides: Partial<ConsentCardProps> = {}) => {
  const props: ConsentCardProps = {
    error: null,
    pendingIntent: null,
    request: baseRequest,
    ...overrides,
  };
  const Component = () => {
    return <ConsentCard {...props} />;
  };
  const Stub = createRoutesStub([{ Component, path: '/' }]);
  return render(<Stub />);
};

const scopeValues = (container: HTMLElement): string[] => {
  return Array.from(
    container.querySelectorAll<HTMLInputElement>('input[name="scope"]'),
  ).map((input) => input.value);
};

describe('ConsentCard', () => {
  test('names the app and the host it is identified by', () => {
    const component = renderCard();

    expect(component.getByTestId('ConsentCard-app')).toHaveTextContent(
      'Claude Code',
    );
    expect(component.getByTestId('ConsentCard-host')).toHaveTextContent(
      'claude.ai',
    );
  });

  test('falls back to the host when the client has no name', () => {
    const component = renderCard({
      request: { ...baseRequest, clientName: null },
    });

    expect(component.getByTestId('ConsentCard-app')).toHaveTextContent(
      'claude.ai',
    );
  });

  describe('when write access is requested', () => {
    test('submits both scopes by default', () => {
      const component = renderCard();

      expect(scopeValues(component.container)).toEqual([
        'mcp:read',
        'mcp:write',
      ]);
    });

    test('drops mcp:write when the user switches it off', async () => {
      const user = userEvent.setup();
      const component = renderCard();

      await user.click(component.getByTestId('ConsentCard-write-switch'));

      expect(scopeValues(component.container)).toEqual(['mcp:read']);
    });
  });

  describe('when only read access is requested', () => {
    test('offers no write switch and submits read only', () => {
      const component = renderCard({
        request: { ...baseRequest, requestedScopes: ['mcp:read'] },
      });

      expect(component.queryByTestId('ConsentCard-write-switch')).toBeNull();
      expect(scopeValues(component.container)).toEqual(['mcp:read']);
    });
  });

  test('disables both buttons and labels the pending one while submitting', () => {
    const component = renderCard({ pendingIntent: 'approve' });

    expect(component.getByTestId('ConsentCard-allow')).toBeDisabled();
    expect(component.getByTestId('ConsentCard-allow')).toHaveTextContent(
      OAUTH_CONSENT_COPY.allowing,
    );
    expect(component.getByTestId('ConsentCard-deny')).toBeDisabled();
  });

  test('shows an action error', () => {
    const component = renderCard({ error: 'expired' });

    expect(component.getByRole('alert')).toHaveTextContent('expired');
  });
});
