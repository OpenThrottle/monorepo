import { act, renderHook } from '@testing-library/react';
import type { ChatModelOption } from '@openthrottle/react-router-chat';
import {
  chatToolbarStateAtom,
  DEFAULT_CHAT_TOOLBAR_STATE,
} from '@openthrottle/react-router-chat-state';
import { getDefaultStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { RepositoryOption } from '~/routing/home/data/models.server';
import {
  useRunSkillDialog,
  type UseRunSkillDialogOptions,
} from '../useRunSkillDialog';

const store = getDefaultStore();

const cliModel: ChatModelOption = {
  groupId: 'claude',
  id: 'claude',
  label: 'Claude',
};

const openaiModel: ChatModelOption = {
  groupId: 'openai:ollama',
  id: 'http://localhost:11434/v1::llama3',
  label: 'llama3',
};

const repository: RepositoryOption = {
  displayName: 'monorepo',
  id: 'repo-1',
};

function renderRunSkillDialog(overrides?: Partial<UseRunSkillDialogOptions>) {
  const options: UseRunSkillDialogOptions = {
    models: [cliModel],
    open: true,
    repositories: [repository],
    slug: 'my-skill',
    ...overrides,
  };

  return renderHook(
    (props: UseRunSkillDialogOptions) => useRunSkillDialog(props),
    {
      initialProps: options,
    },
  );
}

describe('useRunSkillDialog', () => {
  beforeEach(() => {
    store.set(chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE);
  });

  afterEach(() => {
    store.set(chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE);
  });

  test('reports hasModels/isCliBackend and a resolved modelId from the models list', () => {
    const { result } = renderRunSkillDialog();

    expect(result.current.hasModels).toBe(true);
    expect(result.current.modelId).toBe('claude');
    expect(result.current.isCliBackend).toBe(true);
  });

  test('hasModels is false and modelId is undefined when no models are discovered', () => {
    const { result } = renderRunSkillDialog({ models: [] });

    expect(result.current.hasModels).toBe(false);
    expect(result.current.modelId).toBeUndefined();
  });

  test('a CLI backend requiring a repository stays submit-disabled while none is registered', () => {
    const { result } = renderRunSkillDialog({ repositories: [] });

    expect(result.current.repositoryId).toBeUndefined();
    expect(result.current.submitDisabled).toBe(true);
    expect(result.current.buildPayload()).toBeNull();
  });

  test('a CLI backend defaults the repository to the first registered checkout', () => {
    const { result } = renderRunSkillDialog();

    expect(result.current.repositoryId).toBe('repo-1');
    expect(result.current.submitDisabled).toBe(false);
  });

  test('setRepositoryId writes through the shared toolbar atom', () => {
    const secondRepository: RepositoryOption = {
      displayName: 'other',
      id: 'repo-2',
    };
    const { result } = renderRunSkillDialog({
      repositories: [repository, secondRepository],
    });

    act(() => {
      result.current.setRepositoryId('repo-2');
    });

    expect(result.current.repositoryId).toBe('repo-2');
    expect(store.get(chatToolbarStateAtom).repositoryId).toBe('repo-2');
  });

  test('an openai backend never requires a repository, so submit is enabled without one', () => {
    const { result } = renderRunSkillDialog({
      models: [openaiModel],
      repositories: [],
    });

    expect(result.current.isCliBackend).toBe(false);
    expect(result.current.submitDisabled).toBe(false);
  });

  test('buildPayload composes the /<slug> message with trimmed args and a CLI fields shape', () => {
    const { result } = renderRunSkillDialog();

    act(() => {
      result.current.setArgs('  hello world  ');
    });

    const payload = result.current.buildPayload();
    expect(payload).not.toBeNull();
    expect(payload?.message).toBe('/my-skill hello world');
    expect(payload?.fields.backend).toBe('claude');
    expect(payload?.fields.modelId).toBe('');
    expect(payload?.fields.repositoryId).toBe('repo-1');
  });

  test('buildPayload with blank args composes the bare /<slug> command', () => {
    const { result } = renderRunSkillDialog();

    const payload = result.current.buildPayload();
    expect(payload?.message).toBe('/my-skill');
  });

  test('buildPayload for an openai backend omits repository/permission fields', () => {
    const { result } = renderRunSkillDialog({
      models: [openaiModel],
      repositories: [],
    });

    const payload = result.current.buildPayload();
    expect(payload?.fields.backend).toBe('openai');
    expect(payload?.fields.baseUrl).toBe('http://localhost:11434/v1');
    expect(payload?.fields.modelId).toBe('llama3');
    expect(payload?.fields.repositoryId).toBeUndefined();
  });

  test('setModelId writes through the shared toolbar atom', () => {
    const { result } = renderRunSkillDialog({
      models: [cliModel, openaiModel],
    });

    act(() => {
      result.current.setModelId(openaiModel.id);
    });

    expect(result.current.modelId).toBe(openaiModel.id);
    expect(store.get(chatToolbarStateAtom).modelId).toBe(openaiModel.id);
  });

  test('checkouts map repositories to id/label picker options', () => {
    const { result } = renderRunSkillDialog();

    expect(result.current.checkouts).toEqual([
      { id: 'repo-1', label: 'monorepo' },
    ]);
  });

  test('opening the dialog resets the local args but preserves the toolbar selection', () => {
    const { rerender, result } = renderRunSkillDialog({ open: false });

    act(() => {
      result.current.setArgs('leftover');
    });
    expect(result.current.args).toBe('leftover');

    rerender({
      models: [cliModel],
      open: true,
      repositories: [repository],
      slug: 'my-skill',
    });

    expect(result.current.args).toBe('');
  });
});
