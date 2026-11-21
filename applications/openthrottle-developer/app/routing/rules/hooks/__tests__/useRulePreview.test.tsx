import { act, render, waitFor } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { RULE_PREVIEW_PATH } from '~/routing/rules/config/rule-preview';
import type { RulePreviewState } from '~/routing/rules/types';
import type { RulePreviewMatch } from '~/routing/rules/utils/rule-preview-params';

import type { UseRulePreviewResult } from '../useRulePreview';
import { useRulePreview } from '../useRulePreview';

const BASE_MATCH: RulePreviewMatch = {
  actionType: 'inject-task',
  environment: null,
  repositoryId: null,
  status: null,
  tagAll: [],
};

const readyState = (matchedCount: number): RulePreviewState => {
  return {
    kind: 'ready',
    preview: {
      cap: 500,
      environment: null,
      evaluated: 10,
      matched: [],
      matchedCount,
      nonMatching: [],
      specificity: 0,
      truncated: false,
    },
  };
};

const renderPreview = (
  initial: RulePreviewMatch,
): {
  readonly loaderCalls: string[];
  readonly rerender: (match: RulePreviewMatch) => void;
  readonly value: { current: UseRulePreviewResult | null };
} => {
  const loaderCalls: string[] = [];
  const value: { current: UseRulePreviewResult | null } = { current: null };
  const setMatchRef: { current: (match: RulePreviewMatch) => void } = {
    current: () => undefined,
  };

  function Probe(): null {
    const [match, setMatch] = React.useState(initial);
    setMatchRef.current = setMatch;
    value.current = useRulePreview({ debounceMs: 20, match });

    return null;
  }

  const Stub = createRoutesStub([
    { Component: Probe, path: '/' },
    {
      loader: ({ request }) => {
        loaderCalls.push(new URL(request.url).search);

        return readyState(loaderCalls.length);
      },
      path: RULE_PREVIEW_PATH,
    },
  ]);
  render(<Stub initialEntries={['/']} />);

  return {
    loaderCalls,
    rerender: (match) => {
      act(() => {
        setMatchRef.current(match);
      });
    },
    value,
  };
};

describe('useRulePreview', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('is loading with no result until the first debounced request lands', async () => {
    const { loaderCalls, value } = renderPreview(BASE_MATCH);

    expect(value.current?.state).toBeNull();
    expect(value.current?.loading).toBe(true);
    expect(loaderCalls).toEqual([]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30);
    });

    await waitFor(() => {
      expect(value.current?.state?.kind).toBe('ready');
    });
    expect(loaderCalls).toHaveLength(1);
    expect(loaderCalls[0]).toContain('actionType=inject-task');
  });

  test('does not refetch when only the tagAll array identity changes', async () => {
    const { loaderCalls, rerender, value } = renderPreview({
      ...BASE_MATCH,
      tagAll: ['spike'],
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30);
    });
    await waitFor(() => {
      expect(value.current?.state?.kind).toBe('ready');
    });

    rerender({ ...BASE_MATCH, tagAll: ['spike'] });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });

    expect(loaderCalls).toHaveLength(1);
  });

  test('refetches with the new match fields after a change', async () => {
    const { loaderCalls, rerender, value } = renderPreview(BASE_MATCH);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30);
    });
    await waitFor(() => {
      expect(value.current?.state?.kind).toBe('ready');
    });

    rerender({ ...BASE_MATCH, status: 'PENDING' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30);
    });

    await waitFor(() => {
      expect(loaderCalls).toHaveLength(2);
    });
    expect(loaderCalls[1]).toContain('status=PENDING');
  });
});
