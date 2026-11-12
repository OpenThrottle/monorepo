import { describe, expect, it } from 'vitest';

import { USER_PREFERENCES_ERROR_REASONS } from './user-preferences.constants.ts';
import { UserPreferences } from './user-preferences.entity.ts';
import {
  emptyUserPreferences,
  toUserPreferencesData,
  validateUserPreferencesPatch,
} from './user-preferences.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';

const makeRow = (overrides: Partial<UserPreferences>): UserPreferences => {
  const row = new UserPreferences();
  row.userId = userId;
  row.defaultEditor = null;
  row.defaultAgentBackend = null;
  row.defaultAgentModel = null;
  row.defaultAgentEffort = null;
  return Object.assign(row, overrides);
};

describe('validateUserPreferencesPatch', () => {
  describe('when the patch is empty', () => {
    it('leaves every preference unchanged', () => {
      expect(validateUserPreferencesPatch({})).toEqual({
        ok: true,
        patch: { defaultAgent: undefined, defaultEditor: undefined },
      });
    });
  });

  describe('when values are null', () => {
    it('passes null through as a clear', () => {
      expect(
        validateUserPreferencesPatch({
          defaultAgent: null,
          defaultEditor: null,
        }),
      ).toEqual({
        ok: true,
        patch: { defaultAgent: null, defaultEditor: null },
      });
    });
  });

  describe('defaultEditor', () => {
    it('accepts a known editor id', () => {
      const result = validateUserPreferencesPatch({ defaultEditor: 'cursor' });
      expect(result).toEqual({
        ok: true,
        patch: { defaultAgent: undefined, defaultEditor: 'cursor' },
      });
    });

    it('rejects an unknown editor id', () => {
      const result = validateUserPreferencesPatch({ defaultEditor: 'emacs' });
      expect(result).toMatchObject({
        ok: false,
        reason: USER_PREFERENCES_ERROR_REASONS.invalidEditor,
      });
    });
  });

  describe('defaultAgent', () => {
    it('accepts a known backend with a model and effort', () => {
      const result = validateUserPreferencesPatch({
        defaultAgent: { backend: 'claude', effort: 'high', model: 'opus' },
      });
      expect(result).toEqual({
        ok: true,
        patch: {
          defaultAgent: { backend: 'claude', effort: 'high', model: 'opus' },
          defaultEditor: undefined,
        },
      });
    });

    it('accepts a null effort (backend default)', () => {
      const result = validateUserPreferencesPatch({
        defaultAgent: { backend: 'cursor', effort: null, model: 'auto' },
      });
      expect(result).toMatchObject({
        ok: true,
        patch: { defaultAgent: { effort: null } },
      });
    });

    it('rejects an unknown backend', () => {
      const result = validateUserPreferencesPatch({
        defaultAgent: { backend: 'copilot', effort: null, model: 'gpt' },
      });
      expect(result).toMatchObject({
        ok: false,
        reason: USER_PREFERENCES_ERROR_REASONS.invalidAgentBackend,
      });
    });

    it('rejects a backend without a model', () => {
      const result = validateUserPreferencesPatch({
        defaultAgent: { backend: 'claude', effort: null, model: '  ' },
      });
      expect(result).toMatchObject({
        ok: false,
        reason: USER_PREFERENCES_ERROR_REASONS.agentModelRequired,
      });
    });

    it('rejects an unknown effort', () => {
      const result = validateUserPreferencesPatch({
        defaultAgent: { backend: 'claude', effort: 'insane', model: 'opus' },
      });
      expect(result).toMatchObject({
        ok: false,
        reason: USER_PREFERENCES_ERROR_REASONS.invalidAgentEffort,
      });
    });
  });

  describe('when the editor is invalid and the agent is valid', () => {
    it('rejects the whole patch', () => {
      const result = validateUserPreferencesPatch({
        defaultAgent: { backend: 'claude', effort: null, model: 'opus' },
        defaultEditor: 'emacs',
      });
      expect(result.ok).toBe(false);
    });
  });
});

describe('emptyUserPreferences', () => {
  it('is all NULL', () => {
    expect(emptyUserPreferences(userId)).toEqual({
      defaultAgent: null,
      defaultEditor: null,
      userId,
    });
  });
});

describe('toUserPreferencesData', () => {
  describe('when every column is set and valid', () => {
    it('maps the row', () => {
      const row = makeRow({
        defaultAgentBackend: 'codex',
        defaultAgentEffort: 'medium',
        defaultAgentModel: 'gpt-5.2',
        defaultEditor: 'vscode',
      });
      expect(toUserPreferencesData(row)).toEqual({
        defaultAgent: { backend: 'codex', effort: 'medium', model: 'gpt-5.2' },
        defaultEditor: 'vscode',
        userId,
      });
    });
  });

  describe('when the agent columns are NULL', () => {
    it('reads no default agent', () => {
      expect(toUserPreferencesData(makeRow({})).defaultAgent).toBeNull();
    });
  });

  describe('when a stored value is no longer valid', () => {
    it('ignores an unknown editor', () => {
      const row = makeRow({ defaultEditor: 'emacs' });
      expect(toUserPreferencesData(row).defaultEditor).toBeNull();
    });

    it('ignores an unknown backend', () => {
      const row = makeRow({
        defaultAgentBackend: 'retired-cli',
        defaultAgentModel: 'm',
      });
      expect(toUserPreferencesData(row).defaultAgent).toBeNull();
    });

    it('keeps the agent but drops an unknown effort', () => {
      const row = makeRow({
        defaultAgentBackend: 'claude',
        defaultAgentEffort: 'insane',
        defaultAgentModel: 'opus',
      });
      expect(toUserPreferencesData(row).defaultAgent).toEqual({
        backend: 'claude',
        effort: null,
        model: 'opus',
      });
    });
  });
});
