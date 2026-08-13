import * as React from 'react';
import { act, render } from '@testing-library/react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PlanRunConfigStoreProvider } from '~/routing/plans/components/PlanRunConfigStoreProvider';
import {
  WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE,
  WORKFLOW_RUN_OPTIONS_SEARCH_PARAM,
} from '~/routing/plans/utils/workflow-run-options-search-param';
import { usePlanRunConfigEditor } from '../usePlanRunConfigEditor';
import type {
  PlanRunConfigEditorPlan,
  UsePlanRunConfigEditorResult,
} from '../usePlanRunConfigEditor';

interface EditorProbeValue {
  hook: UsePlanRunConfigEditorResult;
  search: URLSearchParams;
}

function renderEditor(
  plan: PlanRunConfigEditorPlan | null,
  initialEntries: string[] = ['/'],
): { current: EditorProbeValue | null } {
  const value: { current: EditorProbeValue | null } = { current: null };
  function HookProbe(): null {
    const [search] = useSearchParams();
    const hook = usePlanRunConfigEditor(plan);
    value.current = { hook, search };
    return null;
  }
  // eslint-disable-next-line react/no-multi-comp
  function EditorProbe(): React.ReactElement {
    return (
      <PlanRunConfigStoreProvider
        plan={
          plan ?? { id: 'unseeded', jobRunHooksJson: null, runConfigJson: null }
        }
      >
        <HookProbe />
      </PlanRunConfigStoreProvider>
    );
  }
  const Stub = createRoutesStub([{ Component: EditorProbe, path: '/' }]);
  render(<Stub initialEntries={initialEntries} />);
  return value;
}

describe('usePlanRunConfigEditor', () => {
  test('returns idle pending flags and no-op saves without a plan', () => {
    const value = renderEditor(null);

    expect(value.current?.hook.saveJobRunHooksPending).toBe(false);
    expect(value.current?.hook.saveRunConfigPending).toBe(false);

    // Guard clauses on missing plan.id: calling these must not throw.
    act(() => value.current?.hook.onSaveJobRunHooks());
    act(() => value.current?.hook.onSaveRunConfig());
    act(() => value.current?.hook.onResetToDefaults());
  });

  test('onToggleExpanded(true) sets the expanded search param', () => {
    const value = renderEditor({
      id: 'plan-1',
      jobRunHooksJson: null,
      runConfigJson: null,
    });

    act(() => value.current?.hook.onToggleExpanded(true));

    expect(value.current?.search.get(WORKFLOW_RUN_OPTIONS_SEARCH_PARAM)).toBe(
      WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE,
    );
  });

  test('onToggleExpanded(false) removes the expanded search param', () => {
    const value = renderEditor(
      { id: 'plan-1', jobRunHooksJson: null, runConfigJson: null },
      [
        `/?${WORKFLOW_RUN_OPTIONS_SEARCH_PARAM}=${WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE}`,
      ],
    );

    act(() => value.current?.hook.onToggleExpanded(false));

    expect(
      value.current?.search.get(WORKFLOW_RUN_OPTIONS_SEARCH_PARAM),
    ).toBeNull();
  });
});
