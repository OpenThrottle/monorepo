import { describe, expect, test } from 'vitest';

import {
  deriveSkillSourceUrl,
  parseSkillsLockFile,
} from '../parse-skills-lock.ts';

describe('parseSkillsLockFile', () => {
  test('parses slug entries with source and sourceType', () => {
    const lock = parseSkillsLockFile(
      JSON.stringify({
        skills: {
          'brag-sheet': {
            computedHash: 'abc',
            skillPath: 'skills/brag-sheet/SKILL.md',
            source: 'github/awesome-copilot',
            sourceType: 'github',
          },
        },
        version: 1,
      }),
    );

    expect(lock['brag-sheet']).toEqual({
      source: 'github/awesome-copilot',
      sourceType: 'github',
    });
  });

  test('returns an empty map for malformed JSON', () => {
    expect(parseSkillsLockFile('not json {')).toEqual({});
  });

  test('returns an empty map when the skills object is absent', () => {
    expect(parseSkillsLockFile(JSON.stringify({ version: 1 }))).toEqual({});
  });

  test('skips entries without a string source', () => {
    const lock = parseSkillsLockFile(
      JSON.stringify({
        skills: {
          bad: { source: 42 },
          good: { source: 'owner/repo', sourceType: 'github' },
        },
      }),
    );

    expect(Object.keys(lock)).toEqual(['good']);
  });
});

describe('deriveSkillSourceUrl', () => {
  test('expands github shorthand to a github.com URL', () => {
    expect(
      deriveSkillSourceUrl({
        source: 'github/awesome-copilot',
        sourceType: 'github',
      }),
    ).toBe('https://github.com/github/awesome-copilot');
  });

  test('passes a full URL source through unchanged', () => {
    expect(
      deriveSkillSourceUrl({
        source: 'https://example.com/skills/thing',
        sourceType: 'registry',
      }),
    ).toBe('https://example.com/skills/thing');
  });

  test('yields undefined for a missing entry, empty source, or unknown type', () => {
    expect(deriveSkillSourceUrl(undefined)).toBeUndefined();
    expect(
      deriveSkillSourceUrl({ source: '  ', sourceType: 'github' }),
    ).toBeUndefined();
    expect(
      deriveSkillSourceUrl({ source: 'owner/repo', sourceType: 'registry' }),
    ).toBeUndefined();
  });
});
