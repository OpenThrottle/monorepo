import { describe, expect, test } from 'vitest';
import { parseAgentSearchParams } from '../parsers';

describe('parseAgentSearchParams', () => {
  test('parses q, type, and projectId when all are present', () => {
    const params = new URLSearchParams({
      projectId: 'proj-1',
      q: 'hello',
      type: 'skills',
    });

    expect(parseAgentSearchParams(params)).toEqual({
      projectId: 'proj-1',
      q: 'hello',
      tab: 'skills',
    });
  });

  test('defaults q to empty string and tab to all when params are missing', () => {
    const params = new URLSearchParams();

    expect(parseAgentSearchParams(params)).toEqual({
      projectId: null,
      q: '',
      tab: 'all',
    });
  });

  test('falls back to the "all" tab for an unrecognized type value', () => {
    const params = new URLSearchParams({ type: 'bogus' });

    expect(parseAgentSearchParams(params).tab).toBe('all');
  });

  test('accepts each known tab value', () => {
    for (const tab of ['all', 'skills', 'rules', 'personas']) {
      const params = new URLSearchParams({ type: tab });
      expect(parseAgentSearchParams(params).tab).toBe(tab);
    }
  });

  test('trims a blank projectId down to null', () => {
    const params = new URLSearchParams({ projectId: '   ' });

    expect(parseAgentSearchParams(params).projectId).toBeNull();
  });

  test('trims surrounding whitespace from a non-blank projectId', () => {
    const params = new URLSearchParams({ projectId: '  proj-2  ' });

    expect(parseAgentSearchParams(params).projectId).toBe('proj-2');
  });
});
