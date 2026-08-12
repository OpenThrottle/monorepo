import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../settings.rollout.$flagId._index';
import { RolloutFlagKind } from '~/__generated__/graphql';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';

function stubMatches(): React.ComponentProps<typeof Component>['matches'];
function stubMatches(): unknown {
  return [];
}

const mockFlag: RolloutFlagFieldsFragment = {
  __typename: 'RolloutFlagObject',
  createdAt: '2026-07-24T00:00:00.000Z',
  description: 'Gates the redesigned dashboard',
  enabled: true,
  fallthrough: { variations: [{ variation: 1, weight: 100 }] },
  id: 'flag-1',
  key: 'new-dashboard',
  kind: RolloutFlagKind.Boolean,
  offVariation: 0,
  targetRoles: [],
  updatedAt: '2026-07-24T00:00:00.000Z',
  variations: [
    { description: null, name: null, valueJson: 'false' },
    { description: null, name: null, valueJson: 'true' },
  ],
};

describe('routes/settings.rollout.$flagId._index.tsx', () => {
  test('renders the flag detail card', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ flag: mockFlag }}
          matches={stubMatches()}
          params={{ flagId: 'flag-1' }}
        />
      </MemoryRouter>,
    );

    expect(view.getByTestId('RolloutFlagDetail')).toBeInTheDocument();
    expect(view.getByText('new-dashboard')).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/settings/rollout/flag-1/edit',
    );
  });
});
