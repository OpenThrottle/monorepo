import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test } from 'vitest';
import { useUrlSyncedTabValue } from '../useUrlSyncedTabValue';

const PARAM = 'tab';
const DISPLAY_ID = 'search-params-string';

const PLAN_DETAIL_TABS = new Set(['overview', 'tasks', 'output']);

function parsePlanDetailTab(
  raw: string | null,
): 'overview' | 'tasks' | 'output' | undefined {
  if (raw === null || raw === '') {
    return undefined;
  }
  return PLAN_DETAIL_TABS.has(raw)
    ? (raw as 'overview' | 'tasks' | 'output')
    : undefined;
}

function TabHarness(props: { readonly withParse?: boolean }) {
  const [searchParams] = useSearchParams();
  const { onValueChange, value } = useUrlSyncedTabValue({
    defaultValue: 'overview',
    param: PARAM,
    ...(props.withParse ? { parse: parsePlanDetailTab } : {}),
  });

  return (
    <div>
      <span data-testid={DISPLAY_ID}>{searchParams.toString()}</span>
      <span data-testid="active-tab">{value}</span>
      <button
        data-testid="select-overview"
        onClick={() => onValueChange('overview')}
        type="button"
      >
        Overview
      </button>
      <button
        data-testid="select-tasks"
        onClick={() => onValueChange('tasks')}
        type="button"
      >
        Tasks
      </button>
      <button
        data-testid="select-invalid"
        onClick={() => onValueChange('nope')}
        type="button"
      >
        Invalid
      </button>
    </div>
  );
}

describe('useUrlSyncedTabValue', () => {
  test('reads defaultValue when param is absent', () => {
    const RoutesStub = createRoutesStub([{ Component: TabHarness, path: '/' }]);

    render(<RoutesStub initialEntries={['/']} />);

    expect(screen.getByTestId('active-tab')).toHaveTextContent('overview');
    expect(screen.getByTestId(DISPLAY_ID)).toHaveTextContent('');
  });

  test('reads tab value from the URL', () => {
    const RoutesStub = createRoutesStub([{ Component: TabHarness, path: '/' }]);

    render(<RoutesStub initialEntries={[`/?${PARAM}=tasks`]} />);

    expect(screen.getByTestId('active-tab')).toHaveTextContent('tasks');
  });

  describe('when parse is provided', () => {
    test('falls back to defaultValue for invalid param', () => {
      const RoutesStub = createRoutesStub([
        { Component: () => <TabHarness withParse={true} />, path: '/' },
      ]);

      render(<RoutesStub initialEntries={[`/?${PARAM}=nope`]} />);

      expect(screen.getByTestId('active-tab')).toHaveTextContent('overview');
    });

    test('onValueChange sets param for non-default tab', async () => {
      const user = userEvent.setup();
      const RoutesStub = createRoutesStub([
        { Component: () => <TabHarness withParse={true} />, path: '/' },
      ]);

      render(<RoutesStub initialEntries={['/']} />);

      await user.click(screen.getByTestId('select-tasks'));

      expect(screen.getByTestId('active-tab')).toHaveTextContent('tasks');
      expect(screen.getByTestId(DISPLAY_ID).textContent).toContain(
        `${PARAM}=tasks`,
      );
    });

    test('onValueChange deletes param when selecting default tab', async () => {
      const user = userEvent.setup();
      const RoutesStub = createRoutesStub([
        { Component: () => <TabHarness withParse={true} />, path: '/' },
      ]);

      render(<RoutesStub initialEntries={[`/?${PARAM}=tasks`]} />);

      await user.click(screen.getByTestId('select-overview'));

      expect(screen.getByTestId('active-tab')).toHaveTextContent('overview');
      expect(screen.getByTestId(DISPLAY_ID)).toHaveTextContent('');
    });

    test('onValueChange treats invalid next as default and clears param', async () => {
      const user = userEvent.setup();
      const RoutesStub = createRoutesStub([
        { Component: () => <TabHarness withParse={true} />, path: '/' },
      ]);

      render(<RoutesStub initialEntries={[`/?${PARAM}=tasks`]} />);

      await user.click(screen.getByTestId('select-invalid'));

      expect(screen.getByTestId('active-tab')).toHaveTextContent('overview');
      expect(screen.getByTestId(DISPLAY_ID)).toHaveTextContent('');
    });
  });

  describe('when parse is omitted', () => {
    test('onValueChange sets param from raw next value', async () => {
      const user = userEvent.setup();
      const RoutesStub = createRoutesStub([
        { Component: TabHarness, path: '/' },
      ]);

      render(<RoutesStub initialEntries={['/']} />);

      await user.click(screen.getByTestId('select-tasks'));

      expect(screen.getByTestId('active-tab')).toHaveTextContent('tasks');
      expect(screen.getByTestId(DISPLAY_ID).textContent).toContain(
        `${PARAM}=tasks`,
      );
    });
  });
});
