import { describe, expect, it } from 'vitest';

import { AGENT_CONVERSATION_GROUP_NAME_MAX_LENGTH } from '../agent-conversation-groups.constants.ts';
import { normalizeAgentConversationGroupName } from './group-names.utils.ts';

describe('normalizeAgentConversationGroupName', () => {
  it('trims a valid name', () => {
    expect(normalizeAgentConversationGroupName('  Work  ')).toEqual({
      name: 'Work',
      ok: true,
    });
  });

  it('refuses an empty or whitespace-only name', () => {
    expect(normalizeAgentConversationGroupName('   ').ok).toBe(false);
    expect(normalizeAgentConversationGroupName('').ok).toBe(false);
  });

  it('accepts exactly the max length and refuses one more', () => {
    const atMax = 'a'.repeat(AGENT_CONVERSATION_GROUP_NAME_MAX_LENGTH);

    expect(normalizeAgentConversationGroupName(atMax).ok).toBe(true);
    expect(normalizeAgentConversationGroupName(`${atMax}a`).ok).toBe(false);
  });
});
