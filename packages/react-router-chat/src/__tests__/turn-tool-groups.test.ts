import { describe, expect, test } from 'vitest';
import {
  activeToolOf,
  aggregateToolStatus,
  buildTurnTimeline,
  foldTurnActivity,
} from '../turn-tool-groups';
import type { ChatTurnEvent, ChatTurnToolEvent } from '../types';

const tool = (
  overrides: Partial<ChatTurnToolEvent> = {},
): ChatTurnToolEvent => ({
  argsJson: null,
  callId: null,
  error: null,
  kind: 'tool',
  name: 'read',
  resultJson: null,
  sortOrder: 0,
  status: 'succeeded',
  ...overrides,
});

const text = (sortOrder: number): ChatTurnEvent => ({
  kind: 'text',
  sortOrder,
  text: 'hi',
});

const thinking = (sortOrder: number, body = 'hmm'): ChatTurnEvent => ({
  kind: 'thinking',
  sortOrder,
  text: body,
});

const usage = (sortOrder: number): ChatTurnEvent => ({
  error: null,
  kind: 'usage',
  result: null,
  sortOrder,
  usageJson: null,
});

describe('buildTurnTimeline', () => {
  test('folds a run of consecutive tools into one group', () => {
    const items = buildTurnTimeline([
      tool({ name: 'a', sortOrder: 0 }),
      tool({ name: 'b', sortOrder: 1 }),
      tool({ name: 'c', sortOrder: 2 }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'tools' });
    expect(items[0].kind === 'tools' && items[0].tools).toHaveLength(3);
  });

  test('a non-tool event breaks the run into separate groups', () => {
    const items = buildTurnTimeline([
      tool({ name: 'a', sortOrder: 0 }),
      tool({ name: 'b', sortOrder: 1 }),
      text(2),
      tool({ name: 'c', sortOrder: 3 }),
    ]);

    expect(items.map((item) => item.kind)).toEqual(['tools', 'event', 'tools']);
    expect(items[0].kind === 'tools' && items[0].tools).toHaveLength(2);
    expect(items[2].kind === 'tools' && items[2].tools).toHaveLength(1);
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
});
