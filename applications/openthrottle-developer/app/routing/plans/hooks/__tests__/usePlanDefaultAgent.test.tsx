import { renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { PlanDefaultAgentContext } from '~/routing/plans/config/plan-default-agent-context';
import { usePlanDefaultAgent } from '~/routing/plans/hooks/usePlanDefaultAgent';
import type { DefaultAgentDraft } from '~/routing/settings/utils/user-preferences';

const agent: DefaultAgentDraft = {
  backend: 'claude',
  effort: 'high',
  model: 'opus',
};

const withDeferred = (
  deferred: Promise<DefaultAgentDraft | null>,
): ((props: { readonly children: React.ReactNode }) => React.ReactElement) => {
  return (props) => (
    <PlanDefaultAgentContext.Provider value={deferred}>
      {props.children}
    </PlanDefaultAgentContext.Provider>
  );
};

describe('usePlanDefaultAgent', () => {
  test('is null outside the provider', () => {
    const { result } = renderHook(() => usePlanDefaultAgent());

    expect(result.current).toBeNull();
  });

  test('resolves the deferred default agent', async () => {
    const { result } = renderHook(() => usePlanDefaultAgent(), {
      wrapper: withDeferred(Promise.resolve(agent)),
    });

    await waitFor(() => expect(result.current).toEqual(agent));
  });

  test('reads a rejected promise as no preference', async () => {
    const { result } = renderHook(() => usePlanDefaultAgent(), {
      wrapper: withDeferred(Promise.reject(new Error('boom'))),
    });

    await waitFor(() => expect(result.current).toBeNull());
  });
});
