import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { UsageTokenUsage } from '../UsageTokenUsage';
import type { UsageTokenUsageProps } from '../UsageTokenUsage';
import type {
  UsageTokenUsageRowFragment,
  UsageTokenUsageTotalsFragment,
} from '~/__generated__/graphql';

const buildRow = (
  overrides: Partial<UsageTokenUsageRowFragment>,
): UsageTokenUsageRowFragment => ({
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  costUsd: 0,
  createdAt: '2026-07-15T00:00:00.000Z',
  id: overrides.id ?? 'row-1',
  inputTokens: 0,
  model: null,
  outputTokens: 0,
  provider: 'claude',
  reasoningTokens: 0,
  totalTokens: 0,
  ...overrides,
});

const buildTotals = (
  overrides: Partial<UsageTokenUsageTotalsFragment>,
): UsageTokenUsageTotalsFragment => ({
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  costUsd: 0,
  inputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
  turnCount: 0,
  ...overrides,
});

const renderComponent = (props: UsageTokenUsageProps): RenderResult => {
  const Component = (): React.ReactElement => <UsageTokenUsage {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('UsageTokenUsage Component', () => {
  test('renders totals tiles and a per-provider breakdown (all providers)', () => {
    const component = renderComponent({
      items: [
        buildRow({
          id: 'a',
          inputTokens: 1000,
          outputTokens: 300,
          provider: 'claude',
          totalTokens: 1300,
        }),
        buildRow({
          costUsd: 0.01,
          id: 'b',
          inputTokens: 200,
          outputTokens: 40,
          provider: 'openai',
          totalTokens: 240,
        }),
      ],
      rangeDays: 30,
      selectedProvider: null,
      totals: buildTotals({
        costUsd: 0.06,
        inputTokens: 1200,
        outputTokens: 340,
        totalTokens: 1540,
        turnCount: 2,
      }),
    });

    expect(
      component.getByRole('heading', { name: 'Model token usage' }),
    ).toBeInTheDocument();
    // Total-tokens tile (1540 → 1.5k) and cost tile ($0.060).
    expect(component.getByText('1.5k')).toBeInTheDocument();
    expect(component.getByText('$0.060')).toBeInTheDocument();
    // Provider breakdown groups by provider label (table cells, distinct from
    // the same-named filter links).
    expect(component.getByRole('cell', { name: 'Claude' })).toBeInTheDocument();
    expect(component.getByRole('cell', { name: 'OpenAI' })).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Provider' }),
    ).toBeInTheDocument();
  });

  test('provider filter links target ?provider= and mark the active one', () => {
    const component = renderComponent({
      items: [],
      rangeDays: 30,
      selectedProvider: 'claude',
      totals: buildTotals({}),
    });

    // `to="?"` clears the provider param (renders as the bare path).
    expect(
      component.getByRole('link', { name: 'All providers' }),
    ).toHaveAttribute('href', '/');
    const claudeLink = component.getByRole('link', { name: 'Claude' });
    expect(claudeLink).toHaveAttribute('href', '/?provider=claude');
    expect(claudeLink).toHaveAttribute('aria-current', 'true');
  });

  test('provider filter links preserve skill-usage search params', () => {
    const component = renderComponent({
      items: [],
      rangeDays: 30,
      selectedProvider: null,
      skillCwdParam: '/tmp/repo',
      skillGitBranchParam: 'main',
      skillScopeParam: 'ours',
      totals: buildTotals({}),
    });

    const claudeLink = component.getByRole('link', { name: 'Claude' });
    const href = claudeLink.getAttribute('href') ?? '';
    expect(href).toContain('provider=claude');
    expect(href).toContain('skillScope=ours');
    expect(href).toContain('skillBranch=main');
    expect(href).toContain('skillCwd=%2Ftmp%2Frepo');
  });

  test('shows a provider-scoped empty state when no rows', () => {
    const component = renderComponent({
      items: [],
      rangeDays: 30,
      selectedProvider: 'grok',
      totals: buildTotals({}),
    });

    expect(component.getByTestId('UsageTokenUsageEmpty')).toHaveTextContent(
      /No Grok token usage in this range/i,
    );
  });

  test('breaks down by model when a single provider is selected', () => {
    const component = renderComponent({
      items: [
        buildRow({
          id: 'a',
          model: 'claude-opus-4-8',
          provider: 'claude',
          totalTokens: 900,
        }),
        buildRow({
          id: 'b',
          model: 'claude-sonnet-4-5',
          provider: 'claude',
          totalTokens: 100,
        }),
      ],
      rangeDays: 30,
      selectedProvider: 'claude',
      totals: buildTotals({ totalTokens: 1000, turnCount: 2 }),
    });

    expect(
      component.getByRole('columnheader', { name: 'Model' }),
    ).toBeInTheDocument();
    expect(component.getByText('claude-opus-4-8')).toBeInTheDocument();
    expect(component.getByText('claude-sonnet-4-5')).toBeInTheDocument();
  });
});
