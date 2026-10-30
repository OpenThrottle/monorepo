import { formatTokenCount } from '@openthrottle/react-router-chat';
import type { RenderResult } from '@testing-library/react';
import { render, within } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { UsageTokenUsageRowFragment } from '~/__generated__/graphql';
import { TOKEN_USAGE_SOURCES } from '~/routing/usage/data/token-usage-copy';

import type { UsageTokenUsageSourcesProps } from '../UsageTokenUsageSources';
import { UsageTokenUsageSources } from '../UsageTokenUsageSources';

const buildRow = (
  overrides: Partial<UsageTokenUsageRowFragment>,
): UsageTokenUsageRowFragment => ({
  cacheReadTokens: null,
  cacheWriteTokens: null,
  costUsd: null,
  createdAt: '2026-07-15T00:00:00.000Z',
  id: overrides.id ?? 'row-1',
  inputTokens: 0,
  model: null,
  outputTokens: 0,
  provider: 'claude',
  reasoningTokens: null,
  source: TOKEN_USAGE_SOURCES.CHAT,
  totalTokens: 0,
  ...overrides,
});

const renderComponent = (props: UsageTokenUsageSourcesProps): RenderResult => {
  const Component = (): React.ReactElement | null => (
    <UsageTokenUsageSources {...props} />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

const sourceRow = (component: RenderResult, source: string): HTMLElement => {
  const row = component.container.querySelector<HTMLElement>(
    `[data-source="${source}"]`,
  );

  if (row === null) {
    throw new Error(`No row rendered for source ${source}`);
  }

  return row;
};

describe('UsageTokenUsageSources Component', () => {
  describe('with rows from both sources', () => {
    test('renders one row per source with its own turn count and total', () => {
      const component = renderComponent({
        items: [
          buildRow({ costUsd: 0.5, id: 'a', totalTokens: 1000 }),
          buildRow({ costUsd: 0.25, id: 'b', totalTokens: 500 }),
          buildRow({
            id: 'c',
            source: TOKEN_USAGE_SOURCES.CLAUDE_CODE,
            totalTokens: 9000,
          }),
        ],
      });

      const chat = within(sourceRow(component, TOKEN_USAGE_SOURCES.CHAT));
      const claudeCode = within(
        sourceRow(component, TOKEN_USAGE_SOURCES.CLAUDE_CODE),
      );

      expect(chat.getAllByRole('cell')[1]).toHaveTextContent('2');
      expect(chat.getAllByRole('cell')[4]).toHaveTextContent(
        formatTokenCount(1500),
      );
      expect(claudeCode.getAllByRole('cell')[1]).toHaveTextContent('1');
      expect(claudeCode.getAllByRole('cell')[4]).toHaveTextContent(
        formatTokenCount(9000),
      );
    });

    test('shows a dash instead of $0 for a source that reports no cost', () => {
      const component = renderComponent({
        items: [
          buildRow({ costUsd: 0.5, id: 'a', totalTokens: 10 }),
          buildRow({
            id: 'c',
            source: TOKEN_USAGE_SOURCES.CLAUDE_CODE,
            totalTokens: 10,
          }),
        ],
      });

      const costCell = (source: string): HTMLElement | undefined =>
        within(sourceRow(component, source)).getAllByRole('cell')[5];

      expect(costCell(TOKEN_USAGE_SOURCES.CHAT)).toHaveTextContent('$0.500');
      expect(costCell(TOKEN_USAGE_SOURCES.CLAUDE_CODE)).toHaveTextContent('—');
    });
  });

  describe('with legacy or unknown sources', () => {
    test('counts rows with a NULL or blank source as chat', () => {
      const component = renderComponent({
        items: [
          buildRow({ id: 'a', source: null }),
          buildRow({ id: 'b', source: '  ' }),
          buildRow({ id: 'c', source: undefined }),
        ],
      });

      const chat = within(sourceRow(component, TOKEN_USAGE_SOURCES.CHAT));

      expect(chat.getAllByRole('cell')[1]).toHaveTextContent('3');
      expect(
        component.container.querySelectorAll('[data-source]'),
      ).toHaveLength(1);
    });

    test('shows an unknown source as its own row labelled with the raw value', () => {
      const component = renderComponent({
        items: [buildRow({ id: 'a', source: 'some-future-tool' })],
      });

      expect(
        within(sourceRow(component, 'some-future-tool')).getByRole('cell', {
          name: 'some-future-tool',
        }),
      ).toBeInTheDocument();
    });
  });

  describe('with no rows', () => {
    test('renders nothing', () => {
      const component = renderComponent({ items: [] });

      expect(
        component.queryByTestId('UsageTokenUsageSources'),
      ).not.toBeInTheDocument();
    });
  });
});
