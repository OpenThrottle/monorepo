import { describe, expect, test } from 'vitest';

import { isAgentEditor } from '../editors';

describe('isAgentEditor', () => {
  test('recognises the MCP service account', () => {
    expect(isAgentEditor('openthrottle-mcp')).toBe(true);
  });

  test('matches case-insensitively', () => {
    expect(isAgentEditor('OpenThrottle-MCP')).toBe(true);
  });

  test.each(['visormatt', 'Ada Lovelace', 'unknown-service-account'])(
    'treats %s as a person',
    (name) => {
      expect(isAgentEditor(name)).toBe(false);
    },
  );

  test('never treats an email as an agent', () => {
    expect(isAgentEditor('openthrottle-mcp@example.com')).toBe(false);
  });

  test('treats a post with no recorded editor as not agent-edited', () => {
    expect(isAgentEditor(null)).toBe(false);
  });
});
