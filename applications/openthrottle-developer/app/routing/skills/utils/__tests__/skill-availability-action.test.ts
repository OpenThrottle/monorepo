import { describe, expect, test } from 'vitest';
import { serializeList } from '~/routing/skills/utils/skill-availability';
import {
  readRuleInput,
  toEnvironmentValue,
} from '../skill-availability-action';

describe('toEnvironmentValue', () => {
  test('returns null for a null environment', () => {
    expect(toEnvironmentValue(null)).toBeNull();
  });

  test('returns the environment when it is a known value', () => {
    expect(toEnvironmentValue('ci')).toBe('ci');
    expect(toEnvironmentValue('interactive')).toBe('interactive');
    expect(toEnvironmentValue('ralph')).toBe('ralph');
  });

  test('degrades an unknown environment string to null', () => {
    expect(toEnvironmentValue('staging')).toBeNull();
  });
});

describe('readRuleInput', () => {
  test('builds a rule input with a known environment and serialized lists', () => {
    const formData = new FormData();
    formData.set('environment', 'ci');
    formData.set('slugAllow', serializeList(['deploy']));
    formData.set('slugDeny', serializeList(['legacy']));
    formData.set('tagAllow', serializeList(['infra']));
    formData.set('tagDeny', serializeList([]));

    expect(readRuleInput(formData)).toEqual({
      environment: 'ci',
      slugAllow: ['deploy'],
      slugDeny: ['legacy'],
      tagAllow: ['infra'],
      tagDeny: [],
    });
  });

  test('resolves a missing or empty environment field to null', () => {
    const missingFormData = new FormData();
    expect(readRuleInput(missingFormData).environment).toBeNull();

    const emptyFormData = new FormData();
    emptyFormData.set('environment', '');
    expect(readRuleInput(emptyFormData).environment).toBeNull();
  });

  test('resolves missing list fields to empty arrays', () => {
    const formData = new FormData();
    formData.set('environment', 'interactive');

    expect(readRuleInput(formData)).toEqual({
      environment: 'interactive',
      slugAllow: [],
      slugDeny: [],
      tagAllow: [],
      tagDeny: [],
    });
  });
});
