import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { PruneWorktreeCheckoutOutcome } from '~/__generated__/graphql';

import { PruneWorktreesOutcome } from '../PruneWorktreesOutcome';

describe('PruneWorktreesOutcome Component', () => {
  describe('when every record was removed', () => {
    test('announces the count and lists nothing kept', () => {
      const component = render(
        <PruneWorktreesOutcome
          results={[
            {
              checkoutId: 'a',
              outcome: PruneWorktreeCheckoutOutcome.Pruned,
              path: '/wt/a',
            },
            {
              checkoutId: 'b',
              outcome: PruneWorktreeCheckoutOutcome.Pruned,
              path: '/wt/b',
            },
          ]}
        />,
      );

      expect(component.getByRole('status')).toHaveTextContent('2');
      expect(component.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('when some records were kept', () => {
    test('lists each kept record by path, or by id when it has none', () => {
      const component = render(
        <PruneWorktreesOutcome
          results={[
            {
              checkoutId: 'a',
              outcome: PruneWorktreeCheckoutOutcome.Pruned,
              path: '/wt/a',
            },
            {
              checkoutId: 'b',
              outcome: PruneWorktreeCheckoutOutcome.SkippedActiveRun,
              path: '/wt/b',
            },
            {
              checkoutId: 'c',
              outcome: PruneWorktreeCheckoutOutcome.NotFound,
              path: null,
            },
          ]}
        />,
      );

      const items = component.getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('/wt/b');
      expect(items[1]).toHaveTextContent('c');
    });
  });
});
