import { describe, expect, test } from 'vitest';
import {
  SKILLS_DETAIL_TAB_SEARCH_PARAM,
  parseSkillDetailTab,
} from '../parse-skill-detail-tab';

describe('parseSkillDetailTab', () => {
  test('uses the shared `tab` search param', () => {
    expect(SKILLS_DETAIL_TAB_SEARCH_PARAM).toBe('tab');
  });

  test.each(['skill', 'usage'] as const)('accepts %p', (raw) => {
    expect(parseSkillDetailTab(raw)).toBe(raw);
  });

  test.each([null, '', 'overview', 'SKILL', 'tasks'])(
    'returns null for %p',
    (raw) => {
      expect(parseSkillDetailTab(raw)).toBeNull();
    },
  );
});
