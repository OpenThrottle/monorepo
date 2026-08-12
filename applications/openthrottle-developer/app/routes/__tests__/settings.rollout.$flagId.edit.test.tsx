import * as React from 'react';
import { describe, expect, test } from 'vitest';
import Component from '../settings.rollout.$flagId.edit';
import { RolloutFlagKind } from '~/__generated__/graphql';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

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

describe('routes/settings.rollout.$flagId.edit.tsx', () => {
  test('renders the edit form seeded from the loader flag', () => {
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{ flag: mockFlag }}
        matches={stubMatches()}
        params={{ flagId: 'flag-1' }}
      />,
    );

    expect(view.getByTestId('RolloutFlagEditForm')).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/settings/rollout/flag-1',
    );
  });

  test('surfaces the action error when present', () => {
    const view = renderRoutesStub(
      <Component
        actionData={{ error: 'Failed to update flag.' }}
        loaderData={{ flag: mockFlag }}
        matches={stubMatches()}
        params={{ flagId: 'flag-1' }}
      />,
    );

    expect(view.getByRole('alert')).toHaveTextContent('Failed to update flag.');
  });
});
