import { describe, expect, test } from 'vitest';
import {
  detectActiveSlashCommand,
  insertSlashCommand,
  parseSlashCommand,
  SLASH_COMMAND_TRIGGER,
} from '../slash-commands';

describe('detectActiveSlashCommand', () => {
  test('exposes the / trigger marker', () => {
    expect(SLASH_COMMAND_TRIGGER).toBe('/');
  });

  test('returns null for an empty draft', () => {
    expect(detectActiveSlashCommand('', 0)).toBeNull();
  });

  test('triggers on a bare / with an empty query', () => {
    expect(detectActiveSlashCommand('/', 1)).toEqual({ anchor: 0, query: '' });
  });

  test('triggers on a leading /token and reads the query up to the caret', () => {
    expect(detectActiveSlashCommand('/gra', 4)).toEqual({
      anchor: 0,
      query: 'gra',
    });
    // Caret in the middle of the token reads only up to the caret.
    expect(detectActiveSlashCommand('/graph', 3)).toEqual({
      anchor: 0,
      query: 'gr',
    });
  });

  test('does NOT trigger for a mid-line / after text (start-of-line rule)', () => {
    // The `/` is not at a line start, so it is treated as ordinary text.
    expect(detectActiveSlashCommand('hi /x', 5)).toBeNull();
  });

  test('returns null when the caret sits before the / (not inside the token)', () => {
    expect(detectActiveSlashCommand('/gra', 0)).toBeNull();
  });

  test('closes once whitespace follows the slug (entering arguments)', () => {
    expect(detectActiveSlashCommand('/skills foo', 11)).toBeNull();
    // A trailing space right after the slug also closes it.
    expect(detectActiveSlashCommand('/skills ', 8)).toBeNull();
  });

  test('does not trigger when leading whitespace precedes the /', () => {
    expect(detectActiveSlashCommand(' /gra', 5)).toBeNull();
  });

  test('triggers on a / at the start of a later line (start-of-line rule)', () => {
    const value = 'foo\n/bar';
    expect(detectActiveSlashCommand(value, value.length)).toEqual({
      anchor: 4,
      query: 'bar',
    });
  });

  test('allows colon-namespaced slugs in the query', () => {
    const value = '/vercel:ai';
    expect(detectActiveSlashCommand(value, value.length)).toEqual({
      anchor: 0,
      query: 'vercel:ai',
    });
  });
});

describe('insertSlashCommand', () => {
  test('replaces the /query with the /<slug> token plus a trailing space', () => {
    // '/gra' with caret after 'gra' (index 4), choosing 'graphify'
    const result = insertSlashCommand('/gra', 0, 4, 'graphify');
    expect(result.value).toBe('/graphify ');
    expect(result.caret).toBe(result.value.length);
  });

  test('preserves text after the caret and lands the caret after the space', () => {
    // '/gr rest' with the command query 'gr' spanning [0,3)
    const result = insertSlashCommand('/gr rest', 0, 3, 'graphify');
    expect(result.value).toBe('/graphify  rest');
    expect(result.caret).toBe('/graphify '.length);
  });
});

describe('parseSlashCommand', () => {
  test('returns null for a non-command message', () => {
    expect(parseSlashCommand('')).toBeNull();
    expect(parseSlashCommand('just some prose')).toBeNull();
    expect(parseSlashCommand('/')).toBeNull();
  });

  test('extracts a slug with no args', () => {
    expect(parseSlashCommand('/graphify')).toEqual({
      args: '',
      slug: 'graphify',
    });
  });

  test('extracts a slug plus trailing args', () => {
    expect(parseSlashCommand('/skills run the audit')).toEqual({
      args: 'run the audit',
      slug: 'skills',
    });
  });

  test('trims surrounding whitespace from the args', () => {
    expect(parseSlashCommand('/skills   spaced   ')).toEqual({
      args: 'spaced',
      slug: 'skills',
    });
  });

  test('supports colon-namespaced slugs', () => {
    expect(parseSlashCommand('/vercel:ai-sdk build a chat')).toEqual({
      args: 'build a chat',
      slug: 'vercel:ai-sdk',
    });
  });
});
