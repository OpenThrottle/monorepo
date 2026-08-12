import { describe, expect, test } from 'vitest';
import {
  environmentChoiceToValue,
  environmentValueToChoice,
  findInvalidSlugs,
  isKebabCase,
  isSkillAvailabilityEnvironment,
  isSkillAvailabilityEnvironmentChoice,
  isSkillAvailabilityPosture,
  parseListField,
  parseSlugInput,
  ruleHasAnyEntry,
  serializeList,
  SKILL_AVAILABILITY_EMPTY_RULE,
  SKILL_AVAILABILITY_ENVIRONMENT_ALL,
  SKILL_AVAILABILITY_ENVIRONMENTS,
  SKILL_AVAILABILITY_POSTURES,
} from '../skill-availability';

describe('constants', () => {
  test('SKILL_AVAILABILITY_POSTURES has the allow/deny postures', () => {
    expect(SKILL_AVAILABILITY_POSTURES).toEqual(['allow', 'deny']);
  });

  test('SKILL_AVAILABILITY_ENVIRONMENTS has the known environments', () => {
    expect(SKILL_AVAILABILITY_ENVIRONMENTS).toEqual([
      'ci',
      'interactive',
      'ralph',
    ]);
  });

  test('SKILL_AVAILABILITY_ENVIRONMENT_ALL is the all sentinel', () => {
    expect(SKILL_AVAILABILITY_ENVIRONMENT_ALL).toBe('all');
  });

  test('SKILL_AVAILABILITY_EMPTY_RULE seeds a blank, every-environment rule', () => {
    expect(SKILL_AVAILABILITY_EMPTY_RULE).toEqual({
      environment: null,
      slugAllow: [],
      slugDeny: [],
      tagAllow: [],
      tagDeny: [],
    });
  });
});

describe('isKebabCase', () => {
  test('accepts lowercase, hyphenated slugs', () => {
    expect(isKebabCase('my-skill-name')).toBe(true);
    expect(isKebabCase('skill')).toBe(true);
    expect(isKebabCase('a1-b2')).toBe(true);
  });

  test('rejects uppercase letters', () => {
    expect(isKebabCase('My-Skill')).toBe(false);
  });

  test('rejects leading, trailing, or double hyphens', () => {
    expect(isKebabCase('-skill')).toBe(false);
    expect(isKebabCase('skill-')).toBe(false);
    expect(isKebabCase('skill--name')).toBe(false);
  });

  test('rejects spaces or underscores', () => {
    expect(isKebabCase('my skill')).toBe(false);
    expect(isKebabCase('my_skill')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isKebabCase('')).toBe(false);
  });
});

describe('isSkillAvailabilityPosture', () => {
  test('accepts known postures', () => {
    expect(isSkillAvailabilityPosture('allow')).toBe(true);
    expect(isSkillAvailabilityPosture('deny')).toBe(true);
  });

  test('rejects unknown values', () => {
    expect(isSkillAvailabilityPosture('maybe')).toBe(false);
  });
});

describe('isSkillAvailabilityEnvironment', () => {
  test('accepts known environments', () => {
    expect(isSkillAvailabilityEnvironment('ci')).toBe(true);
    expect(isSkillAvailabilityEnvironment('interactive')).toBe(true);
    expect(isSkillAvailabilityEnvironment('ralph')).toBe(true);
  });

  test('rejects the all sentinel and unknown values', () => {
    expect(isSkillAvailabilityEnvironment('all')).toBe(false);
    expect(isSkillAvailabilityEnvironment('staging')).toBe(false);
  });
});

describe('isSkillAvailabilityEnvironmentChoice', () => {
  test('accepts the all sentinel', () => {
    expect(isSkillAvailabilityEnvironmentChoice('all')).toBe(true);
  });

  test('accepts real environments', () => {
    expect(isSkillAvailabilityEnvironmentChoice('ci')).toBe(true);
  });

  test('rejects unknown values', () => {
    expect(isSkillAvailabilityEnvironmentChoice('staging')).toBe(false);
  });
});

describe('parseSlugInput', () => {
  test('splits on commas and whitespace', () => {
    expect(parseSlugInput('foo, bar  baz')).toEqual(['foo', 'bar', 'baz']);
  });

  test('drops empty fragments', () => {
    expect(parseSlugInput('foo,, ,bar')).toEqual(['foo', 'bar']);
  });

  test('dedupes while preserving first-seen order', () => {
    expect(parseSlugInput('foo, bar, foo')).toEqual(['foo', 'bar']);
  });

  test('returns an empty array for empty input', () => {
    expect(parseSlugInput('')).toEqual([]);
  });
});

describe('findInvalidSlugs', () => {
  test('returns an empty array when every slug is valid kebab-case', () => {
    expect(findInvalidSlugs(['foo', 'foo-bar'])).toEqual([]);
  });

  test('returns the offending slugs', () => {
    expect(findInvalidSlugs(['foo', 'Bad_Slug', 'ok-slug', '-bad'])).toEqual([
      'Bad_Slug',
      '-bad',
    ]);
  });
});

describe('ruleHasAnyEntry', () => {
  test('returns false when every list is empty', () => {
    expect(
      ruleHasAnyEntry({
        slugAllow: [],
        slugDeny: [],
        tagAllow: [],
        tagDeny: [],
      }),
    ).toBe(false);
  });

  test('returns true when any list has an entry', () => {
    expect(
      ruleHasAnyEntry({
        slugAllow: ['my-skill'],
        slugDeny: [],
        tagAllow: [],
        tagDeny: [],
      }),
    ).toBe(true);
    expect(
      ruleHasAnyEntry({
        slugAllow: [],
        slugDeny: [],
        tagAllow: [],
        tagDeny: ['deprecated'],
      }),
    ).toBe(true);
  });
});

describe('serializeList and parseListField', () => {
  test('round-trips a string list through a hidden form field', () => {
    const list = ['foo', 'bar'];
    expect(parseListField(serializeList(list))).toEqual(list);
  });

  test('round-trips an empty list', () => {
    expect(parseListField(serializeList([]))).toEqual([]);
  });

  test('parseListField returns [] for null', () => {
    expect(parseListField(null)).toEqual([]);
  });

  test('parseListField returns [] for an empty or whitespace string', () => {
    expect(parseListField('')).toEqual([]);
    expect(parseListField('   ')).toEqual([]);
  });

  test('parseListField returns [] for malformed JSON that is not an array', () => {
    expect(parseListField('{"not":"an array"}')).toEqual([]);
  });

  test('parseListField drops non-string entries from the parsed array', () => {
    expect(parseListField('["foo", 1, "bar", null]')).toEqual(['foo', 'bar']);
  });
});

describe('environmentChoiceToValue', () => {
  test('maps the all sentinel to null', () => {
    expect(environmentChoiceToValue('all')).toBeNull();
  });

  test('passes real environments through unchanged', () => {
    expect(environmentChoiceToValue('ci')).toBe('ci');
    expect(environmentChoiceToValue('interactive')).toBe('interactive');
    expect(environmentChoiceToValue('ralph')).toBe('ralph');
  });
});

describe('environmentValueToChoice', () => {
  test('maps null to the all sentinel', () => {
    expect(environmentValueToChoice(null)).toBe('all');
  });

  test('passes real environments through unchanged', () => {
    expect(environmentValueToChoice('ci')).toBe('ci');
  });
});
