import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { PlanRunWorktreeTeardownOutcome } from '~/__generated__/graphql';
import { REMOVE_PLAN_RUN_WORKTREE_COPY } from '~/routing/settings/repositories/data/data.copy';

import { WorktreeRemovalOutcome } from '../WorktreeRemovalOutcome';

const PATH = '/Users/dev/.openthrottle/worktrees/acme/monorepo/plan-c34e018b';

describe('WorktreeRemovalOutcome Component', () => {
  describe('when the worktree was removed', () => {
    test('names the removed path and the kept branch', () => {
      const component = render(
        <WorktreeRemovalOutcome
          result={{
            branch: 'openthrottle/plan-c34e018b',
            checkoutId: 'checkout-1',
            detail: null,
            outcome: PlanRunWorktreeTeardownOutcome.Removed,
            path: PATH,
          }}
        />,
      );

      expect(component.getByRole('status')).toHaveTextContent(
        REMOVE_PLAN_RUN_WORKTREE_COPY.removed(
          PATH,
          'openthrottle/plan-c34e018b',
        ),
      );
    });
  });

  describe('when a guard kept the worktree', () => {
    test('says why', () => {
      const component = render(
        <WorktreeRemovalOutcome
          result={{
            branch: null,
            checkoutId: 'checkout-1',
            detail: 'it has uncommitted changes',
            outcome: PlanRunWorktreeTeardownOutcome.KeptDirty,
            path: PATH,
          }}
        />,
      );

      expect(component.getByRole('status')).toHaveAttribute(
        'data-outcome',
        PlanRunWorktreeTeardownOutcome.KeptDirty,
      );
      expect(component.getByRole('status')).toHaveTextContent(
        REMOVE_PLAN_RUN_WORKTREE_COPY.kept(PATH, 'it has uncommitted changes'),
      );
    });
  });
});
