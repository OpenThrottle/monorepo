import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILL_DETAIL_COPY } from '~/routing/skills/data/data.copy';
import { useSkillDetail, type SkillDetailOptions } from '../useSkillDetail';

const baseEntry = (
  overrides: Partial<RepoSkillEntry> = {},
): RepoSkillEntry => ({
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: 'skills/my-skill/SKILL.md',
  slug: 'my-skill',
  source: 'openthrottle',
  summary: 'A test skill.',
  tags: undefined,
  ...overrides,
});

const baseOptions = (
  overrides: Partial<SkillDetailOptions> = {},
): SkillDetailOptions => ({
  content: 'original content',
  editable: true,
  entry: baseEntry(),
  saving: false,
  ...overrides,
});

describe('useSkillDetail', () => {
  test('starts read-only with the pristine content as the draft', () => {
    const { result } = renderHook(() =>
      useSkillDetail(baseOptions({ content: 'hello world' })),
    );

    expect(result.current.isEditing).toBe(false);
    expect(result.current.draft).toBe('hello world');
    expect(result.current.isDirty).toBe(false);
  });

  test('handleEdit enters edit mode and seeds the draft from content', () => {
    const { result } = renderHook(() =>
      useSkillDetail(baseOptions({ content: 'hello world' })),
    );

    act(() => result.current.handleEdit());

    expect(result.current.isEditing).toBe(true);
    expect(result.current.draft).toBe('hello world');
  });

  test('handleDraftChange marks the draft dirty relative to content', () => {
    const { result } = renderHook(() =>
      useSkillDetail(baseOptions({ content: 'hello world' })),
    );

    act(() => result.current.handleEdit());
    act(() => result.current.handleDraftChange('changed content'));

    expect(result.current.draft).toBe('changed content');
    expect(result.current.isDirty).toBe(true);
  });

  test('handleDraftChange with undefined clears the draft to empty string', () => {
    const { result } = renderHook(() =>
      useSkillDetail(baseOptions({ content: 'hello world' })),
    );

    act(() => result.current.handleEdit());
    act(() => result.current.handleDraftChange(undefined));

    expect(result.current.draft).toBe('');
  });

  test('handleCancel restores the pristine content and exits edit mode', () => {
    const { result } = renderHook(() =>
      useSkillDetail(baseOptions({ content: 'hello world' })),
    );

    act(() => result.current.handleEdit());
    act(() => result.current.handleDraftChange('changed content'));
    act(() => result.current.handleCancel());

    expect(result.current.isEditing).toBe(false);
    expect(result.current.draft).toBe('hello world');
    expect(result.current.isDirty).toBe(false);
  });

  test('handleSave invokes onSave with the current draft', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useSkillDetail(baseOptions({ content: 'hello world', onSave })),
    );

    act(() => result.current.handleEdit());
    act(() => result.current.handleDraftChange('saved content'));
    act(() => result.current.handleSave());

    expect(onSave).toHaveBeenCalledWith('saved content');
  });

  test('handleSave is a no-op when onSave is not provided', () => {
    const { result } = renderHook(() =>
      useSkillDetail(baseOptions({ content: 'hello world' })),
    );

    expect(() => {
      act(() => result.current.handleSave());
    }).not.toThrow();
  });

  test('leaves edit mode once a save completes without a rejection', () => {
    const { rerender, result } = renderHook(
      (opts: SkillDetailOptions) => useSkillDetail(opts),
      { initialProps: baseOptions({ content: 'v1', saving: true }) },
    );

    act(() => result.current.handleEdit());
    expect(result.current.isEditing).toBe(true);

    // Save finishes: saving flips false, no saveError, loader revalidates with
    // fresh content.
    rerender(baseOptions({ content: 'v2', saving: false }));

    expect(result.current.isEditing).toBe(false);
    expect(result.current.draft).toBe('v2');
  });

  test('stays in edit mode when a save finishes with a rejection', () => {
    const { rerender, result } = renderHook(
      (opts: SkillDetailOptions) => useSkillDetail(opts),
      { initialProps: baseOptions({ content: 'v1', saving: true }) },
    );

    act(() => result.current.handleEdit());
    act(() => result.current.handleDraftChange('rejected draft'));

    rerender(
      baseOptions({
        content: 'v1',
        saveError: 'Save failed',
        saving: false,
      }),
    );

    expect(result.current.isEditing).toBe(true);
    expect(result.current.draft).toBe('rejected draft');
  });

  test('keeps a non-dirty draft in sync with content while not editing', () => {
    const { rerender, result } = renderHook(
      (opts: SkillDetailOptions) => useSkillDetail(opts),
      { initialProps: baseOptions({ content: 'v1' }) },
    );

    rerender(baseOptions({ content: 'v2' }));

    expect(result.current.draft).toBe('v2');
    expect(result.current.isDirty).toBe(false);
  });

  test('canEdit is true for an editable openthrottle entry', () => {
    const { result } = renderHook(() => useSkillDetail(baseOptions()));

    expect(result.current.canEdit).toBe(true);
    expect(result.current.editDisabledTooltip).toBe(
      SKILL_DETAIL_COPY.editDisabledTooltip,
    );
  });

  test('canEdit is false for an external entry even with a local checkout', () => {
    const { result } = renderHook(() =>
      useSkillDetail(
        baseOptions({
          editable: true,
          entry: baseEntry({ source: 'external' }),
        }),
      ),
    );

    expect(result.current.canEdit).toBe(false);
    expect(result.current.editDisabledTooltip).toBe(
      SKILL_DETAIL_COPY.editExternalTooltip,
    );
  });

  test('canEdit is false for an openthrottle entry with no local checkout', () => {
    const { result } = renderHook(() =>
      useSkillDetail(baseOptions({ editable: false })),
    );

    expect(result.current.canEdit).toBe(false);
    expect(result.current.editDisabledTooltip).toBe(
      SKILL_DETAIL_COPY.editDisabledTooltip,
    );
  });

  test('provenance wins the tooltip when both blockers apply', () => {
    const { result } = renderHook(() =>
      useSkillDetail(
        baseOptions({
          editable: false,
          entry: baseEntry({ source: 'external' }),
        }),
      ),
    );

    expect(result.current.editDisabledTooltip).toBe(
      SKILL_DETAIL_COPY.editExternalTooltip,
    );
  });

  test('handleEdit leaves edit mode closed for an external entry', () => {
    const { result } = renderHook(() =>
      useSkillDetail(baseOptions({ entry: baseEntry({ source: 'external' }) })),
    );

    act(() => result.current.handleEdit());

    expect(result.current.isEditing).toBe(false);
  });
});
