import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { RolloutFlagKind } from '~/__generated__/graphql';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';
import Component from '../settings.rollout._index';

vi.mock('@openthrottle/react-router-rollout', () => ({
  useIsRolloutEnabled: vi.fn(() => false),
  useRollout: vi.fn(() => ({
    applicationKey: 'openthrottle-developer',
    hydration: { status: 'ready' },
    values: {},
  })),
}));

function stubMatches(): React.ComponentProps<typeof Component>['matches'];
function stubMatches(): unknown {
  return [];
}

const flags: RolloutFlagFieldsFragment[] = [
  {
    createdAt: '2026-07-24T00:00:00.000Z',
    description: null,
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
  },
];

describe('routes/settings.rollout._index.tsx', () => {
  test('renders the flags table for seeded flags', () => {
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{ flags }}
        matches={stubMatches()}
        params={{}}
      />,
    );

    expect(view.getByText('new-dashboard')).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'New flag' })).toBeInTheDocument();
  });

  test('renders an empty flags table with no rows', () => {
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{ flags: [] }}
        matches={stubMatches()}
        params={{}}
      />,
    );

    expect(view.queryByText('new-dashboard')).not.toBeInTheDocument();
  });

  test('surfaces the action error from a failed submission once the create dialog is open', async () => {
    const user = userEvent.setup();
    const view = renderRoutesStub(
      <Component
        actionData={{ error: 'A flag key is required.' }}
        loaderData={{ flags: [] }}
        matches={stubMatches()}
        params={{}}
      />,
    );

    await user.click(view.getByRole('button', { name: 'New flag' }));

    expect(
      await view.findByText('A flag key is required.'),
    ).toBeInTheDocument();
  });
});
