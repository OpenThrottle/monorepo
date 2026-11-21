import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { cleanup, render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';

import type { RulePreviewFragment } from '~/__generated__/graphql';
import type { RulePreviewState } from '~/routing/rules/types';

import { RulePreviewSection } from '../RulePreviewSection';

const preview = (
  overrides: Partial<RulePreviewFragment>,
): RulePreviewFragment => {
  return {
    cap: 500,
    environment: null,
    evaluated: 3,
    matched: [
      { id: 'plan-1', repositoryId: 'repo-1', status: 'PENDING', title: 'Hit' },
    ],
    matchedCount: 1,
    nonMatching: [
      {
        conditions: [
          {
            actual: null,
            condition: 'repository',
            expected: 'repo-1',
            passed: false,
          },
        ],
        failedOnlyOnEnvironment: false,
        id: 'plan-2',
        missingTags: ['spike'],
        repositoryId: null,
        status: 'PENDING',
        title: 'Miss',
      },
    ],
    specificity: 2,
    truncated: false,
    ...overrides,
  };
};

const renderSection = (state: RulePreviewState): ReturnType<typeof render> => {
  const Component = (): React.ReactElement => {
    return (
      <TooltipProvider>
        <RulePreviewSection
          repositoryNames={new Map([['repo-1', 'monorepo']])}
          state={state}
        />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('RulePreviewSection', () => {
  afterEach(() => {
    cleanup();
  });

  describe('a ready preview', () => {
    test('lists matched and non-matching plans, each linking to its plan', async () => {
      const component = renderSection({ kind: 'ready', preview: preview({}) });

      expect(
        await component.findByRole('link', { name: 'Hit' }),
      ).toHaveAttribute('href', '/plans/plan-1');
      expect(component.getByRole('link', { name: 'Miss' })).toHaveAttribute(
        'href',
        '/plans/plan-2',
      );
      expect(component.getAllByTestId('RulePreviewMatchedPlan')).toHaveLength(
        1,
      );
      expect(
        component.getAllByTestId('RulePreviewNonMatchingPlan'),
      ).toHaveLength(1);
      expect(
        component.getByTestId('RulePreviewMissingTags'),
      ).toBeInTheDocument();
    });

    test('shows the truncation note only when truncated', async () => {
      const full = renderSection({ kind: 'ready', preview: preview({}) });
      await full.findByTestId('RulePreviewTotals');
      expect(
        full.queryByTestId('RulePreviewTruncated'),
      ).not.toBeInTheDocument();
      cleanup();

      const cut = renderSection({
        kind: 'ready',
        preview: preview({ truncated: true }),
      });
      expect(
        await cut.findByTestId('RulePreviewTruncated'),
      ).toBeInTheDocument();
    });

    test('renders no plan rows when nothing was evaluated', async () => {
      const component = renderSection({
        kind: 'ready',
        preview: preview({
          evaluated: 0,
          matched: [],
          matchedCount: 0,
          nonMatching: [],
        }),
      });

      await component.findByTestId('RulePreviewTotals');
      expect(component.queryAllByTestId('RulePreviewMatchedPlan')).toHaveLength(
        0,
      );
      expect(
        component.queryAllByTestId('RulePreviewNonMatchingPlan'),
      ).toHaveLength(0);
    });
  });

  describe('an error state', () => {
    test('shows an alert and no plan rows', async () => {
      const component = renderSection({ kind: 'error', message: 'down' });

      expect(await component.findByRole('alert')).toHaveTextContent('down');
      expect(
        component.queryByTestId('RulePreviewTotals'),
      ).not.toBeInTheDocument();
    });
  });
});
