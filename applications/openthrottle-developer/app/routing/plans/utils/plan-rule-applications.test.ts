import { describe, expect, test } from 'vitest';
import { attentionRank, renderDetails } from './plan-rule-applications';

describe('attentionRank', () => {
  test('ranks flagged first', () => {
    expect(attentionRank('flagged')).toBe(0);
  });

  test('ranks orphaned second', () => {
    expect(attentionRank('orphaned')).toBe(1);
  });

  test('ranks any other state last', () => {
    expect(attentionRank('applied')).toBe(2);
    expect(attentionRank('unknown')).toBe(2);
  });
});

describe('renderDetails', () => {
  test('returns null for null input', () => {
    expect(renderDetails(null)).toBeNull();
  });

  test('returns null for undefined input', () => {
    expect(renderDetails(undefined)).toBeNull();
  });

  test('returns null for an empty string', () => {
    expect(renderDetails('')).toBeNull();
  });

  test('renders a compact key: value line for a valid JSON object', () => {
    const json = JSON.stringify({ from: 'draft', to: 'active' });

    expect(renderDetails(json)).toBe('from: "draft" · to: "active"');
  });

  test('falls back to the raw string for JSON that is not an object', () => {
    expect(renderDetails('"just a string"')).toBe('"just a string"');
    expect(renderDetails('42')).toBe('42');
    expect(renderDetails('null')).toBe('null');
  });

  test('falls back to the raw string for invalid JSON', () => {
    expect(renderDetails('{not valid json')).toBe('{not valid json');
  });
});
