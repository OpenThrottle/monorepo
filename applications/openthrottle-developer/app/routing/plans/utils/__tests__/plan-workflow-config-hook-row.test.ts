import { describe, expect, test } from 'vitest';
import {
  isJobRunHookKind,
  isJobRunHookOnFailureValue,
} from '../plan-workflow-config-hook-row';

describe('isJobRunHookKind', () => {
  test('accepts prompt_profile', () => {
    expect(isJobRunHookKind('prompt_profile')).toBe(true);
  });

  test('accepts skill', () => {
    expect(isJobRunHookKind('skill')).toBe(true);
  });

  test('rejects an unrecognized value', () => {
    expect(isJobRunHookKind('bogus')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isJobRunHookKind('')).toBe(false);
  });
});

describe('isJobRunHookOnFailureValue', () => {
  test('accepts block, default, ignore, and warn', () => {
    expect(isJobRunHookOnFailureValue('block')).toBe(true);
    expect(isJobRunHookOnFailureValue('default')).toBe(true);
    expect(isJobRunHookOnFailureValue('ignore')).toBe(true);
    expect(isJobRunHookOnFailureValue('warn')).toBe(true);
  });

  test('rejects an unrecognized value', () => {
    expect(isJobRunHookOnFailureValue('bogus')).toBe(false);
  });
});
