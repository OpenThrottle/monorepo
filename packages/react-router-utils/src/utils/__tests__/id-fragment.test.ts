import { describe, expect, test } from 'vitest';
import {
  classifyIdInput,
  ID_INPUT_KIND,
  isFullUuid,
  isShortIdFragment,
  MIN_ID_FRAGMENT_LENGTH,
  normalizeIdFragment,
  REGEX_UUID,
} from '../id-fragment';

const FULL_UUID = 'f5e40886-36d3-4886-9781-9722e0b9217b';

describe('REGEX_UUID', () => {
  test('matches a full UUID', () => {
    expect(REGEX_UUID.test(FULL_UUID)).toBe(true);
  });

  test('does not match a short fragment', () => {
    expect(REGEX_UUID.test('f5e40886')).toBe(false);
  });
});

describe('normalizeIdFragment', () => {
  test('trims, lowercases, and strips hyphens', () => {
    expect(normalizeIdFragment('  F5E40886-36D3 ')).toBe('f5e4088636d3');
  });

  test(`returns '' below the ${MIN_ID_FRAGMENT_LENGTH}-char threshold`, () => {
    expect(normalizeIdFragment('f5e4')).toBe('');
    expect(normalizeIdFragment('f5e40')).toBe('');
  });

  test(`returns the value at exactly ${MIN_ID_FRAGMENT_LENGTH} chars`, () => {
    expect(normalizeIdFragment('f5e408')).toBe('f5e408');
  });

  test("returns '' for non-hex input", () => {
    expect(normalizeIdFragment('zzzzzzzz')).toBe('');
    expect(normalizeIdFragment('plans-index')).toBe('');
  });

  test('normalizes a full UUID to its 32 hex characters', () => {
    expect(normalizeIdFragment(FULL_UUID)).toBe(FULL_UUID.replace(/-/g, ''));
  });
});

describe('isFullUuid', () => {
  test('true for a full UUID (surrounding whitespace tolerated)', () => {
    expect(isFullUuid(`  ${FULL_UUID}  `)).toBe(true);
  });

  test('false for a short fragment', () => {
    expect(isFullUuid('f5e40886')).toBe(false);
  });
});

describe('isShortIdFragment', () => {
  test('true for a 7-char hex fragment', () => {
    expect(isShortIdFragment('f5e4088')).toBe(true);
  });

  test('true for an 8-char hex fragment', () => {
    expect(isShortIdFragment('f5e40886')).toBe(true);
  });

  test('false for a full UUID (that is a full id, not a fragment)', () => {
    expect(isShortIdFragment(FULL_UUID)).toBe(false);
  });

  test('false below threshold and for non-hex', () => {
    expect(isShortIdFragment('f5e4')).toBe(false);
    expect(isShortIdFragment('hello!')).toBe(false);
  });
});

describe('classifyIdInput', () => {
  test('classifies a full UUID', () => {
    expect(classifyIdInput(FULL_UUID)).toBe(ID_INPUT_KIND.FULL_UUID);
  });

  test('classifies a short hex fragment (7 and 8 chars)', () => {
    expect(classifyIdInput('f5e4088')).toBe(ID_INPUT_KIND.SHORT_FRAGMENT);
    expect(classifyIdInput('f5e40886')).toBe(ID_INPUT_KIND.SHORT_FRAGMENT);
  });

  test('classifies a hyphen-spanning fragment', () => {
    expect(classifyIdInput('f5e40886-36d3')).toBe(ID_INPUT_KIND.SHORT_FRAGMENT);
  });

  test('classifies too-short and non-hex input as none', () => {
    expect(classifyIdInput('f5e4')).toBe(ID_INPUT_KIND.NONE);
    expect(classifyIdInput('plans-index')).toBe(ID_INPUT_KIND.NONE);
    expect(classifyIdInput('')).toBe(ID_INPUT_KIND.NONE);
  });
});
