import { act, render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as React from 'react';
import { describe, expect, test, vi } from 'vitest';
import type {
  JobRunHookDraftRow,
  JobRunHookOnFailure,
  JobRunHookPhase,
} from '~/routing/plans/utils/job-run-hooks-ui';
import type { UsePlanWorkflowConfigHookRowResult } from '../usePlanWorkflowConfigHookRow';
import { usePlanWorkflowConfigHookRow } from '../usePlanWorkflowConfigHookRow';

const createOnChangeMock = () => vi.fn<(next: JobRunHookDraftRow[]) => void>();

interface SkillRowOverrides {
  draftId?: string;
  onFailure?: JobRunHookOnFailure;
  phase?: JobRunHookPhase;
  skillPath?: string;
}

const skillRow = (overrides: SkillRowOverrides = {}) => ({
  draftId: 'row-1',
  kind: 'skill' as const,
  order: 0,
  phase: 'before_run' as const,
  skillPath: '.agents/skills/foo/SKILL.md',
  ...overrides,
});

interface PromptRowOverrides {
  draftId?: string;
  onFailure?: JobRunHookOnFailure;
  prompt?: string;
}

const promptRow = (overrides: PromptRowOverrides = {}) => ({
  draftId: 'row-2',
  kind: 'prompt_profile' as const,
  order: 0,
  phase: 'before_run' as const,
  prompt: 'do the thing',
  promptDelivery: 'named' as const,
  ...overrides,
});

interface PromptFileRowOverrides {
  draftId?: string;
  onFailure?: JobRunHookOnFailure;
  promptFile?: string;
}

const promptFileRow = (overrides: PromptFileRowOverrides = {}) => ({
  draftId: 'row-3',
  kind: 'prompt_profile' as const,
  order: 0,
  phase: 'before_run' as const,
  promptDelivery: 'file' as const,
  promptFile: '',
  ...overrides,
});

/** Renders a controlled input wired to one of the hook's field handlers, so
 * a real DOM change event (via userEvent) drives it without a cast. */
function InputHarness(props: {
  onChange: (
    handlers: UsePlanWorkflowConfigHookRowResult,
  ) => React.ChangeEventHandler<HTMLInputElement>;
  onChangeResult: (result: UsePlanWorkflowConfigHookRowResult) => void;
  options: Parameters<typeof usePlanWorkflowConfigHookRow>[0];
}): React.ReactElement {
  const result = usePlanWorkflowConfigHookRow(props.options);
  props.onChangeResult(result);
  return <input data-testid="input" onChange={props.onChange(result)} />;
}

describe('usePlanWorkflowConfigHookRow', () => {
  test('derives kindValue and onFailureValue defaults', () => {
    const row = skillRow();
    const { result } = renderHook(() =>
      usePlanWorkflowConfigHookRow({
        hooks: [row],
        index: 0,
        onChange: createOnChangeMock(),
        row,
      }),
    );

    expect(result.current.kindValue).toBe('skill');
    expect(result.current.onFailureValue).toBe('default');
  });

  test('canMoveUp/canMoveDown reflect the row position within its own phase', () => {
    const first = skillRow({ draftId: 'a', phase: 'before_run' });
    const second = skillRow({ draftId: 'b', phase: 'before_run' });
    const other = skillRow({ draftId: 'c', phase: 'after_run' });
    const hooks = [first, second, other];

    const { result: firstResult } = renderHook(() =>
      usePlanWorkflowConfigHookRow({
        hooks,
        index: 0,
        onChange: createOnChangeMock(),
        row: first,
      }),
    );
    expect(firstResult.current.canMoveUp).toBe(false);
    expect(firstResult.current.canMoveDown).toBe(true);

    const { result: secondResult } = renderHook(() =>
      usePlanWorkflowConfigHookRow({
        hooks,
        index: 1,
        onChange: createOnChangeMock(),
        row: second,
      }),
    );
    expect(secondResult.current.canMoveUp).toBe(true);
    expect(secondResult.current.canMoveDown).toBe(false);
  });

  test('handleRemove drops the row by draftId', () => {
    const row = skillRow();
    const other = skillRow({ draftId: 'other' });
    const onChange = createOnChangeMock();

    const { result } = renderHook(() =>
      usePlanWorkflowConfigHookRow({
        hooks: [row, other],
        index: 0,
        onChange,
        row,
      }),
    );

    act(() => result.current.handleRemove());

    expect(onChange).toHaveBeenCalledWith([other]);
  });

  test('handleMoveUp and handleMoveDown reorder within the phase group', () => {
    const first = skillRow({ draftId: 'a' });
    const second = skillRow({ draftId: 'b' });
    const hooks = [first, second];
    const onChange = createOnChangeMock();

    const { result } = renderHook(() =>
      usePlanWorkflowConfigHookRow({
        hooks,
        index: 1,
        onChange,
        row: second,
      }),
    );

    act(() => result.current.handleMoveUp());

    expect(onChange).toHaveBeenCalledWith([second, first]);
  });

  test('handlePhaseChange updates the row phase for a valid value', () => {
    const row = skillRow();
    const onChange = createOnChangeMock();

    const { result } = renderHook(() =>
      usePlanWorkflowConfigHookRow({
        hooks: [row],
        index: 0,
        onChange,
        row,
      }),
    );

    act(() => result.current.handlePhaseChange('after_run'));

    expect(onChange).toHaveBeenCalledWith([{ ...row, phase: 'after_run' }]);
  });

  test('handlePhaseChange ignores an invalid value', () => {
    const row = skillRow();
    const onChange = createOnChangeMock();

    const { result } = renderHook(() =>
      usePlanWorkflowConfigHookRow({
        hooks: [row],
        index: 0,
        onChange,
        row,
      }),
    );

    act(() => result.current.handlePhaseChange('not-a-phase'));

    expect(onChange).not.toHaveBeenCalled();
  });

  test('handleKindChange switches a skill row to a prompt_profile row', () => {
    const row = skillRow();
    const onChange = createOnChangeMock();

    const { result } = renderHook(() =>
      usePlanWorkflowConfigHookRow({
        hooks: [row],
        index: 0,
        onChange,
        row,
      }),
    );

    act(() => result.current.handleKindChange('prompt_profile'));

    const [nextRows] = onChange.mock.calls[0];
    expect(nextRows[0].kind).toBe('prompt_profile');
    expect(nextRows[0].draftId).toBe(row.draftId);
  });

  test('handleKindChange switches a prompt_profile row to a skill row', () => {
    const row = promptRow();
    const onChange = createOnChangeMock();

    const { result } = renderHook(() =>
      usePlanWorkflowConfigHookRow({
        hooks: [row],
        index: 0,
        onChange,
        row,
      }),
    );

    act(() => result.current.handleKindChange('skill'));

    const [nextRows] = onChange.mock.calls[0];
    expect(nextRows[0].kind).toBe('skill');
  });

  test('handleOnFailureChange maps "default" to undefined and other values through', () => {
    const row = skillRow({ onFailure: 'warn' });
    const onChange = createOnChangeMock();

    const { result } = renderHook(() =>
      usePlanWorkflowConfigHookRow({
        hooks: [row],
        index: 0,
        onChange,
        row,
      }),
    );

    act(() => result.current.handleOnFailureChange('default'));
    expect(onChange).toHaveBeenLastCalledWith([
      { ...row, onFailure: undefined },
    ]);

    act(() => result.current.handleOnFailureChange('block'));
    expect(onChange).toHaveBeenLastCalledWith([{ ...row, onFailure: 'block' }]);
  });

  test('handleTimeoutChange parses digits and clears on blank input', async () => {
    const user = userEvent.setup();
    const row = skillRow();
    const onChange = createOnChangeMock();
    let latest: UsePlanWorkflowConfigHookRowResult | undefined;

    const component = render(
      <InputHarness
        onChange={(handlers) => handlers.handleTimeoutChange}
        onChangeResult={(result) => {
          latest = result;
        }}
        options={{ hooks: [row], index: 0, onChange, row }}
      />,
    );

    const input = component.getByTestId('input');
    await user.type(input, '120');
    expect(onChange).toHaveBeenLastCalledWith([
      { ...row, timeoutSeconds: 120 },
    ]);

    await user.clear(input);
    expect(onChange).toHaveBeenLastCalledWith([
      { ...row, timeoutSeconds: undefined },
    ]);
    expect(latest?.kindValue).toBe('skill');
  });

  test('handleSkillPathChange updates skillPath', async () => {
    const user = userEvent.setup();
    const row = skillRow({ skillPath: '' });
    const onChange = createOnChangeMock();

    const component = render(
      <InputHarness
        onChange={(handlers) => handlers.handleSkillPathChange}
        onChangeResult={() => undefined}
        options={{ hooks: [row], index: 0, onChange, row }}
      />,
    );

    await user.type(component.getByTestId('input'), 'x');

    expect(onChange).toHaveBeenLastCalledWith([{ ...row, skillPath: 'x' }]);
  });

  test('handlePromptChange updates the prompt text', async () => {
    const user = userEvent.setup();
    const row = promptRow({ prompt: '' });
    const onChange = createOnChangeMock();

    const component = render(
      <InputHarness
        onChange={(handlers) => handlers.handlePromptChange}
        onChangeResult={() => undefined}
        options={{ hooks: [row], index: 0, onChange, row }}
      />,
    );

    await user.type(component.getByTestId('input'), 'y');

    expect(onChange).toHaveBeenLastCalledWith([{ ...row, prompt: 'y' }]);
  });

  test('handlePromptFileChange updates the prompt file path', async () => {
    const user = userEvent.setup();
    const row = promptFileRow();
    const onChange = createOnChangeMock();

    const component = render(
      <InputHarness
        onChange={(handlers) => handlers.handlePromptFileChange}
        onChangeResult={() => undefined}
        options={{ hooks: [row], index: 0, onChange, row }}
      />,
    );

    await user.type(component.getByTestId('input'), 'z');

    expect(onChange).toHaveBeenLastCalledWith([{ ...row, promptFile: 'z' }]);
  });

  test('handleUseFileDelivery and handleUseNamedProfile toggle promptDelivery', () => {
    const row = promptRow();
    const onChange = createOnChangeMock();

    const { result } = renderHook(() =>
      usePlanWorkflowConfigHookRow({
        hooks: [row],
        index: 0,
        onChange,
        row,
      }),
    );

    act(() => result.current.handleUseFileDelivery());
    const [fileRows] = onChange.mock.calls[0];
    const fileRow = fileRows[0];
    expect(fileRow.kind).toBe('prompt_profile');
    expect(fileRow.kind === 'prompt_profile' && fileRow.promptDelivery).toBe(
      'file',
    );

    act(() => result.current.handleUseNamedProfile());
    const [namedRows] = onChange.mock.calls[1];
    const namedRow = namedRows[0];
    expect(namedRow.kind).toBe('prompt_profile');
    expect(namedRow.kind === 'prompt_profile' && namedRow.promptDelivery).toBe(
      'named',
    );
  });
});
