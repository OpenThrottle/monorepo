import { describe, expect, test } from 'vitest';
import {
  parseApiTokenFromFormData,
  parseConnectorKeyFromFormData,
  parseEnabledFromFormData,
  parseLabelFromFormData,
} from '../settings-mcp-action';

describe('parseConnectorKeyFromFormData', () => {
  test('returns a trimmed connector key', () => {
    expect(parseConnectorKeyFromFormData('  github  ')).toBe('github');
  });

  test('returns null for an empty string', () => {
    expect(parseConnectorKeyFromFormData('')).toBeNull();
  });

  test('returns null for a non-string value', () => {
    const file = new File(['content'], 'file.txt');

    expect(parseConnectorKeyFromFormData(file)).toBeNull();
  });

  test('returns null for a null value', () => {
    expect(parseConnectorKeyFromFormData(null)).toBeNull();
  });
});

describe('parseApiTokenFromFormData', () => {
  test('returns a trimmed api token', () => {
    expect(parseApiTokenFromFormData('  secret-token  ')).toBe('secret-token');
  });

  test('returns null when the token is empty', () => {
    expect(parseApiTokenFromFormData('   ')).toBeNull();
  });

  test('returns null for a null value', () => {
    expect(parseApiTokenFromFormData(null)).toBeNull();
  });
});

describe('parseLabelFromFormData', () => {
  test('returns a trimmed label', () => {
    expect(parseLabelFromFormData('  my label  ')).toBe('my label');
  });

  test('returns null when the label is empty', () => {
    expect(parseLabelFromFormData('')).toBeNull();
  });
});

describe('parseEnabledFromFormData', () => {
  test('returns true when the value is the string "true"', () => {
    expect(parseEnabledFromFormData('true')).toBe(true);
  });

  test('returns false when the value is any other string', () => {
    expect(parseEnabledFromFormData('false')).toBe(false);
  });

  test('returns false for a null value', () => {
    expect(parseEnabledFromFormData(null)).toBe(false);
  });

  test('returns false for a non-string value', () => {
    const file = new File(['content'], 'file.txt');

    expect(parseEnabledFromFormData(file)).toBe(false);
  });
});
