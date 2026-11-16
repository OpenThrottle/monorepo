import { describe, expect, it } from 'vitest';

import { developerMcpToolDefinitions } from '../../tool-registry.ts';
import { getReadOnlyToolNames, isReadOnlyTool } from '../tool-access.ts';

const registered = new Set(
  developerMcpToolDefinitions.map((tool) => tool.name),
);

describe('tool access classification', () => {
  it('names only tools that exist (no stale entries)', () => {
    const stale = getReadOnlyToolNames().filter(
      (name) => !registered.has(name),
    );

    expect(stale).toEqual([]);
  });

  it('treats unknown and write tools as writes', () => {
    expect(isReadOnlyTool('a_tool_added_tomorrow')).toBe(false);
    expect(isReadOnlyTool('create_plan')).toBe(false);
    expect(isReadOnlyTool('update_task')).toBe(false);
    expect(isReadOnlyTool('claim_plan_messages')).toBe(false);
  });

  it('classifies every get_/list_ tool as read-only', () => {
    const unclassifiedReads = [...registered].filter(
      (name) => /^(get|list)_/.test(name) && !isReadOnlyTool(name),
    );

    expect(unclassifiedReads).toEqual([]);
  });
});
