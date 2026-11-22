import { describe, expect, test } from 'vitest';

import {
  activeToolOf,
  aggregateToolStatus,
  buildTurnTimeline,
  foldTurnActivity,
  summarizeToolGroup,
} from '../turn-tool-groups';
import type {
  ChatTurnEvent,
  ChatTurnPermissionEvent,
  ChatTurnToolEvent,
} from '../types';

const tool = (
  overrides: Partial<ChatTurnToolEvent> = {},
): ChatTurnToolEvent => {
  return {
    argsJson: null,
    callId: null,
    error: null,
    kind: 'tool',
    name: 'read',
    resultJson: null,
    sortOrder: 0,
    status: 'succeeded',
    ...overrides,
  };
};

const text = (sortOrder: number): ChatTurnEvent => {
  return {
    kind: 'text',
    sortOrder,
    text: 'hi',
  };
};

const permission = (
  sortOrder: number,
  resolution: ChatTurnPermissionEvent['resolution'],
): ChatTurnPermissionEvent => {
  return {
    kind: 'permission',
    options: [],
    requestId: `request-${sortOrder}`,
    resolution,
    sortOrder,
    toolKind: 'execute',
    toolTitle: 'whoami',
  };
};

const thinking = (sortOrder: number, body = 'hmm'): ChatTurnEvent => {
  return {
    kind: 'thinking',
    sortOrder,
    text: body,
  };
};

const usage = (sortOrder: number): ChatTurnEvent => {
  return {
    error: null,
    kind: 'usage',
    result: null,
    sortOrder,
    usageJson: null,
  };
};

describe('buildTurnTimeline', () => {
  test('folds a run of consecutive tools into one group', () => {
    const items = buildTurnTimeline([
      tool({ name: 'a', sortOrder: 0 }),
      tool({ name: 'b', sortOrder: 1 }),
      tool({ name: 'c', sortOrder: 2 }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'tools' });
    expect(items[0]?.kind === 'tools' && items[0]?.tools).toHaveLength(3);
  });

  test('a non-tool event breaks the run into separate groups', () => {
    const items = buildTurnTimeline([
      tool({ name: 'a', sortOrder: 0 }),
      tool({ name: 'b', sortOrder: 1 }),
      text(2),
      tool({ name: 'c', sortOrder: 3 }),
    ]);

    expect(items.map((item) => item.kind)).toEqual(['tools', 'event', 'tools']);
    expect(items[0]?.kind === 'tools' && items[0]?.tools).toHaveLength(2);
    expect(items[2]?.kind === 'tools' && items[2]?.tools).toHaveLength(1);
  });

  test('a lone tool is still a tools slot (renderer decides card vs group)', () => {
    const items = buildTurnTimeline([tool({ sortOrder: 0 })]);
    expect(items).toEqual([{ kind: 'tools', tools: [tool({ sortOrder: 0 })] }]);
  });

  test('interleaved text/thinking preserve order', () => {
    const items = buildTurnTimeline([text(0), tool({ sortOrder: 1 }), text(2)]);
    expect(items.map((item) => item.kind)).toEqual(['event', 'tools', 'event']);
  });

  test('empty input yields no items', () => {
    expect(buildTurnTimeline([])).toEqual([]);
  });
});

describe('aggregateToolStatus', () => {
  test('any running wins (group is live) even over a failure', () => {
    expect(
      aggregateToolStatus([
        tool({ status: 'failed' }),
        tool({ status: 'running' }),
      ]),
    ).toBe('running');
  });

  test('failed when none running but one failed', () => {
    expect(
      aggregateToolStatus([
        tool({ status: 'succeeded' }),
        tool({ status: 'failed' }),
      ]),
    ).toBe('failed');
  });

  test('failed outranks not run', () => {
    expect(
      aggregateToolStatus([
        tool({ status: 'not_run' }),
        tool({ status: 'failed' }),
      ]),
    ).toBe('failed');
  });

  test('not run when none failed but one never ran', () => {
    expect(
      aggregateToolStatus([
        tool({ status: 'succeeded' }),
        tool({ status: 'not_run' }),
      ]),
    ).toBe('not_run');
  });

  test('succeeded when all succeeded', () => {
    expect(
      aggregateToolStatus([
        tool({ status: 'succeeded' }),
        tool({ status: 'succeeded' }),
      ]),
    ).toBe('succeeded');
  });
});

describe('activeToolOf', () => {
  test('is the most recent running tool', () => {
    const active = activeToolOf([
      tool({ name: 'a', sortOrder: 0, status: 'running' }),
      tool({ name: 'b', sortOrder: 1, status: 'running' }),
      tool({ name: 'c', sortOrder: 2, status: 'succeeded' }),
    ]);
    expect(active?.name).toBe('b');
  });

  test('falls back to the last tool when none are running', () => {
    const active = activeToolOf([
      tool({ name: 'a', sortOrder: 0 }),
      tool({ name: 'b', sortOrder: 1 }),
    ]);
    expect(active?.name).toBe('b');
  });

  test('null for an empty group', () => {
    expect(activeToolOf([])).toBeNull();
  });
});

describe('foldTurnActivity', () => {
  test('folds an alternating tool/thinking run into one activity group', () => {
    const slots = foldTurnActivity(
      buildTurnTimeline([
        tool({ name: 'a', sortOrder: 0 }),
        tool({ name: 'b', sortOrder: 1 }),
        thinking(2),
        tool({ name: 'c', sortOrder: 3 }),
        thinking(4),
      ]),
    );

    expect(slots).toHaveLength(1);
    const [group] = slots;
    expect(group?.kind).toBe('activity');
    expect(group?.kind === 'activity' && group).toMatchObject({
      thinkingCount: 2,
      toolCount: 3,
    });
    expect(group?.kind === 'activity' && group.items).toHaveLength(4);
  });

  test('preserves emission order inside the folded group', () => {
    const slots = foldTurnActivity(
      buildTurnTimeline([
        tool({ name: 'a', sortOrder: 0 }),
        thinking(1),
        tool({ name: 'b', sortOrder: 2 }),
      ]),
    );

    const [group] = slots;
    expect(
      group?.kind === 'activity' &&
        group.items.map((item) =>
          item.kind === 'tools' ? item.tools[0]?.name : item.event.kind,
        ),
    ).toEqual(['a', 'thinking', 'b']);
  });

  test('text breaks the fold into separate runs', () => {
    const slots = foldTurnActivity(
      buildTurnTimeline([
        tool({ name: 'a', sortOrder: 0 }),
        thinking(1),
        text(2),
        tool({ name: 'b', sortOrder: 3 }),
        thinking(4),
      ]),
    );

    expect(slots.map((slot) => slot.kind)).toEqual([
      'activity',
      'event',
      'activity',
    ]);
  });

  test('usage terminates the run and passes through unchanged', () => {
    const slots = foldTurnActivity(
      buildTurnTimeline([
        tool({ name: 'a', sortOrder: 0 }),
        thinking(1),
        usage(2),
      ]),
    );

    expect(slots.map((slot) => slot.kind)).toEqual(['activity', 'event']);
  });

  test('a single tool group is not wrapped', () => {
    const slots = foldTurnActivity(
      buildTurnTimeline([
        tool({ name: 'a', sortOrder: 0 }),
        tool({ name: 'b', sortOrder: 1 }),
      ]),
    );

    expect(slots.map((slot) => slot.kind)).toEqual(['tools']);
  });

  test('a lone thinking block is not wrapped', () => {
    const slots = foldTurnActivity(buildTurnTimeline([thinking(0)]));
    expect(slots.map((slot) => slot.kind)).toEqual(['event']);
  });

  test('blank thinking neither renders nor pads the run to the threshold', () => {
    const slots = foldTurnActivity(
      buildTurnTimeline([tool({ name: 'a', sortOrder: 0 }), thinking(1, '  ')]),
    );

    expect(slots.map((slot) => slot.kind)).toEqual(['tools']);
  });

  test('aggregate status spans every nested tool group', () => {
    const running = foldTurnActivity(
      buildTurnTimeline([
        tool({ name: 'a', sortOrder: 0, status: 'failed' }),
        thinking(1),
        tool({ name: 'b', sortOrder: 2, status: 'running' }),
      ]),
    );
    expect(running[0]?.kind === 'activity' && running[0].status).toBe(
      'running',
    );

    const failed = foldTurnActivity(
      buildTurnTimeline([
        tool({ name: 'a', sortOrder: 0, status: 'failed' }),
        thinking(1),
        tool({ name: 'b', sortOrder: 2, status: 'succeeded' }),
      ]),
    );
    expect(failed[0]?.kind === 'activity' && failed[0].status).toBe('failed');
  });

  test('empty input yields no slots', () => {
    expect(foldTurnActivity([])).toEqual([]);
  });

  describe('permission requests', () => {
    // The cursor-over-ACP shape: think → tool → answered permission → think →
    // reply. The answered card must not split the run and strand the last
    // thought as a lone "Thinking" directly above the reply.
    test('an answered request folds with the activity around it', () => {
      const slots = foldTurnActivity(
        buildTurnTimeline([
          thinking(0),
          tool({ name: 'whoami', sortOrder: 1 }),
          permission(2, { optionId: 'allow-once', outcome: 'selected' }),
          thinking(3),
          text(4),
        ]),
      );

      expect(slots.map((slot) => slot.kind)).toEqual(['activity', 'event']);
      const [group, reply] = slots;
      expect(group?.kind === 'activity' && group).toMatchObject({
        thinkingCount: 2,
        toolCount: 1,
      });
      expect(reply?.kind === 'event' && reply.event.kind).toBe('text');
    });

    test('a pending request stays outside the fold', () => {
      const slots = foldTurnActivity(
        buildTurnTimeline([
          thinking(0),
          tool({ name: 'whoami', sortOrder: 1 }),
          permission(2, null),
        ]),
      );

      expect(slots.map((slot) => slot.kind)).toEqual(['activity', 'event']);
      const pending = slots[1];
      expect(pending?.kind === 'event' && pending.event.kind).toBe(
        'permission',
      );
    });
  });
});

const named = (...names: readonly string[]): ChatTurnToolEvent[] => {
  return names.map((name, index) => tool({ name, sortOrder: index }));
};

describe('summarizeToolGroup', () => {
  test.each([
    [
      'Claude',
      [
        'Bash',
        'Edit',
        'MultiEdit',
        'Write',
        'NotebookEdit',
        'Read',
        'Grep',
        'Glob',
        'LS',
        'WebFetch',
        'WebSearch',
      ],
      'Ran 1 command, edited 4 files, read 1 file, ran 3 searches and fetched 2 web pages',
    ],
    [
      'Codex',
      [
        'shell',
        'local_shell',
        'exec_command',
        'command_execution',
        'apply_patch',
        'file_change',
        'web_search',
      ],
      'Ran 4 commands, edited 2 files and fetched 1 web page',
    ],
    [
      'Gemini',
      [
        'run_shell_command',
        'replace',
        'write_file',
        'read_file',
        'read_many_files',
        'list_directory',
        'glob',
        'search_file_content',
        'google_web_search',
        'web_fetch',
      ],
      'Ran 1 command, edited 2 files, read 2 files, ran 3 searches and fetched 2 web pages',
    ],
    [
      'Cursor',
      ['shell', 'read', 'edit', 'grep', 'glob', 'ls', 'run_terminal_cmd'],
      'Ran 2 commands, edited 1 file, read 1 file and ran 3 searches',
    ],
    [
      'OpenCode',
      [
        'bash',
        'read',
        'edit',
        'write',
        'patch',
        'grep',
        'glob',
        'list',
        'webfetch',
      ],
      'Ran 1 command, edited 3 files, read 1 file, ran 3 searches and fetched 1 web page',
    ],
    [
      'Antigravity',
      [
        'run_command',
        'run_terminal_command',
        'view_file',
        'write_to_file',
        'edit_file',
      ],
      'Ran 2 commands, edited 2 files and read 1 file',
    ],
  ])('categorizes %s tool names', (_backend, names, expected) => {
    expect(summarizeToolGroup(named(...names))).toBe(expected);
  });

  test('matches names case-insensitively and treats - as _', () => {
    expect(summarizeToolGroup(named('BASH', 'bash', 'Run-Shell-Command'))).toBe(
      'Ran 3 commands',
    );
  });

  test('uses singular and plural forms', () => {
    expect(summarizeToolGroup(named('bash'))).toBe('Ran 1 command');
    expect(summarizeToolGroup(named('bash', 'bash'))).toBe('Ran 2 commands');
    expect(summarizeToolGroup(named('edit'))).toBe('Edited 1 file');
    expect(summarizeToolGroup(named('read', 'read'))).toBe('Read 2 files');
    expect(summarizeToolGroup(named('grep'))).toBe('Ran 1 search');
    expect(summarizeToolGroup(named('grep', 'glob'))).toBe('Ran 2 searches');
    expect(summarizeToolGroup(named('webfetch'))).toBe('Fetched 1 web page');
  });

  test('reads categories in a fixed order regardless of call order', () => {
    expect(
      summarizeToolGroup(named('webfetch', 'grep', 'read', 'edit', 'bash')),
    ).toBe(
      'Ran 1 command, edited 1 file, read 1 file, ran 1 search and fetched 1 web page',
    );
  });

  test('joins two clauses with "and" and no comma', () => {
    expect(summarizeToolGroup(named('edit', 'bash', 'bash'))).toBe(
      'Ran 2 commands and edited 1 file',
    );
  });

  test('falls back to "Used N tools" when nothing is categorized', () => {
    expect(summarizeToolGroup(named('getMcpTools'))).toBe('Used 1 tool');
    expect(summarizeToolGroup(named('mcp__x__y', 'Task', 'constructor'))).toBe(
      'Used 3 tools',
    );
  });

  test('calls uncategorized tools "other" when mixed with known ones', () => {
    expect(summarizeToolGroup(named('bash', 'mcp__x__y'))).toBe(
      'Ran 1 command and used 1 other tool',
    );
    expect(summarizeToolGroup(named('bash', 'Task', 'mcp__x__y'))).toBe(
      'Ran 1 command and used 2 other tools',
    );
  });

  test('reports an empty group plainly', () => {
    expect(summarizeToolGroup([])).toBe('No tool calls');
  });
});
