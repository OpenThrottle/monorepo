import { describe, expect, test } from 'vitest';
import {
  createDefaultJobRunHookDraftRow,
  normalizeJobRunHookDraftRows,
  parseJobRunHooksJsonFromPlan,
  serializeJobRunHooksConfig,
  validateJobRunHooksDraftRows,
} from '~/routing/plans/utils/job-run-hooks-ui';

describe('job-run-hooks-ui', () => {
  describe('parseJobRunHooksJsonFromPlan', () => {
    test('returns empty array for blank json', () => {
      expect(parseJobRunHooksJsonFromPlan('')).toEqual([]);
      expect(parseJobRunHooksJsonFromPlan(null)).toEqual([]);
    });

    test('parses hooks wrapper', () => {
      const json = JSON.stringify({
        hooks: [
          {
            kind: 'prompt_profile',
            phase: 'before_run',
            prompt: '/agents/ralph',
            promptDelivery: 'named',
          },
        ],
      });
      const entries = parseJobRunHooksJsonFromPlan(json);
      expect(entries).toHaveLength(1);
      expect(entries[0]?.phase).toBe('before_run');
    });
  });

  describe('serializeJobRunHooksConfig', () => {
    test('round-trips through normalize', () => {
      const row = createDefaultJobRunHookDraftRow();
      const entries = normalizeJobRunHookDraftRows([row]);
      const json = serializeJobRunHooksConfig(entries);
      const parsed = parseJobRunHooksJsonFromPlan(json);
      expect(parsed[0]?.kind).toBe('prompt_profile');
    });
  });

  describe('validateJobRunHooksDraftRows', () => {
    test('flags empty skill path', () => {
      const row = createDefaultJobRunHookDraftRow();
      const invalid = {
        ...row,
        kind: 'skill' as const,
        skillPath: '',
      };
      const result = validateJobRunHooksDraftRows([invalid]);
      expect(result.ok).toBe(false);
    });
  });
});
