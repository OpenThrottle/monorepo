import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildClaudeSessionTrajectory,
  claudeSessionEventsToChunks,
  claudeSessionTaskOutcome,
  findClaudeSessionPlanRunId,
  findClaudeSessionSubagentIds,
  findClaudeSessionTaskSegments,
} from '../claude-session.ts';
import { isAtifTrajectory } from '../parse-atif.ts';

const FIXTURES = join(import.meta.dirname, 'fixtures');

const eventsOf = (name: string): readonly unknown[] => {
  return readFileSync(join(FIXTURES, name), 'utf8')
    .split('\n')
    .filter((line) => {
      return line.trim() !== '';
    })
    .map((line): unknown => {
      return JSON.parse(line);
    });
};

const session = eventsOf('claude-session.synthetic.jsonl');
const subagent = eventsOf('agent-abc123.synthetic.jsonl');
const [first, second] = findClaudeSessionTaskSegments(session);
const firstEvents = session.slice(first?.startIndex, first?.endIndex);

const buildFirst = () => {
  return buildClaudeSessionTrajectory({
    agentVersion: '2.1.317',
    openthrottle: { planRunId: 'run-1', taskId: 'task-1' },
    segmentEvents: firstEvents,
    subagents: [{ agentId: 'abc123', events: subagent }],
    taskId: 'task-1',
  });
};

describe('findClaudeSessionTaskSegments', () => {
  it('cuts the session at each begin_task_session', () => {
    expect([first?.taskId, second?.taskId]).toEqual(['task-1', 'task-2']);
  });

  it('closes a segment where the next task begins', () => {
    expect(first).toMatchObject({
      closed: true,
      endIndex: second?.startIndex,
      planId: 'plan-1',
      toolUseId: 't-begin-1',
    });
  });

  it('leaves the last segment open until another boundary appears', () => {
    expect(second).toMatchObject({ closed: false, endIndex: session.length });
  });

  describe('a settle_plan_run call', () => {
    it('closes the segment it ends', () => {
      const settle = {
        message: {
          content: [
            {
              id: 't-settle',
              input: { planRunId: 'run-1', status: 'COMPLETED' },
              name: 'mcp__openthrottle-mcp__settle_plan_run',
              type: 'tool_use',
            },
          ],
        },
        type: 'assistant',
      };
      const segments = findClaudeSessionTaskSegments([...session, settle]);

      expect(segments.map((segment) => segment.closed)).toEqual([true, true]);
    });
  });

  describe('a session that never worked an OpenThrottle task', () => {
    it('has no segments, so nothing is ever uploaded', () => {
      expect(findClaudeSessionTaskSegments(session.slice(0, 3))).toEqual([]);
    });
  });
});

describe('findClaudeSessionPlanRunId', () => {
  it('reads the run id from the register_plan_run result', () => {
    expect(findClaudeSessionPlanRunId(session)).toBe('run-1');
  });

  it('is undefined when the events hold no registration', () => {
    expect(findClaudeSessionPlanRunId(firstEvents)).toBeUndefined();
  });
});

describe('findClaudeSessionSubagentIds', () => {
  it('lists the subagents spawned in the segment', () => {
    expect(findClaudeSessionSubagentIds(firstEvents)).toEqual(['abc123']);
  });
});

describe('claudeSessionTaskOutcome', () => {
  it('reads the terminal update_task status for that task', () => {
    expect(claudeSessionTaskOutcome(firstEvents, 'task-1')).toBe('completed');
  });

  it('is unknown while the task has not ended', () => {
    expect(claudeSessionTaskOutcome(session, 'task-2')).toBe('unknown');
  });
});

describe('claudeSessionEventsToChunks', () => {
  it('counts usage once per request, not once per line', () => {
    const usage = claudeSessionEventsToChunks(firstEvents).filter((chunk) => {
      return chunk.kind === 'usage';
    });

    // r2, r3 (written as two lines), r4, r5, plus the inlined sidechain request: dropping sidechain
    // lines is the caller's job, because a subagent's own transcript is all sidechain lines.
    expect(usage).toHaveLength(5);
  });
});

describe('buildClaudeSessionTrajectory', () => {
  const record = buildFirst();
  const trajectory = record?.trajectory;
  const calls =
    trajectory?.steps.flatMap((step) => {
      return (step.tool_calls ?? []).map((call) => call.function_name);
    }) ?? [];

  it('builds a valid ATIF document', () => {
    expect(isAtifTrajectory(trajectory)).toBe(true);
  });

  it('records the task work in order', () => {
    expect(calls).toEqual([
      'mcp__openthrottle-mcp__begin_task_session',
      'Bash',
      'Agent',
      'mcp__openthrottle-mcp__update_task',
    ]);
  });

  it('ignores inlined sidechain lines', () => {
    expect(JSON.stringify(trajectory)).not.toContain('must be ignored');
  });

  it('points the spawning Agent result at its embedded subagent', () => {
    const results =
      trajectory?.steps.flatMap((step) => step.observation?.results ?? []) ??
      [];
    const spawning = results.find((result) => {
      return result.source_call_id === 't-agent';
    });

    expect(spawning?.subagent_trajectory_ref).toEqual({
      trajectory_id: 'abc123',
    });
    expect(
      results.filter((result) => result.subagent_trajectory_ref !== undefined),
    ).toHaveLength(1);
  });

  it('embeds the subagent with its own trajectory id', () => {
    const [embedded] = trajectory?.subagent_trajectories ?? [];

    expect(embedded?.trajectory_id).toBe('abc123');
    expect(embedded?.steps[0]?.tool_calls?.[0]?.function_name).toBe('Read');
  });

  it('carries the run facts', () => {
    expect(record).toMatchObject({
      durationMs: 8000,
      model: 'claude-opus-5-5',
      outcome: 'completed',
      truncated: false,
    });
    expect(trajectory?.extra?.openthrottle).toMatchObject({
      planRunId: 'run-1',
      taskId: 'task-1',
    });
  });

  it('counts cache reads and writes into the prompt total', () => {
    const metrics = trajectory?.final_metrics;

    // r2 (10+200), r3 (20+300+50), r4 (5+400), r5 (5+500)
    expect(metrics?.total_prompt_tokens).toBe(210 + 370 + 405 + 505);
    expect(metrics?.total_cached_tokens).toBe(200 + 300 + 400 + 500);
  });

  describe('a segment with nothing in it', () => {
    it('builds nothing', () => {
      expect(
        buildClaudeSessionTrajectory({
          agentVersion: 'x',
          openthrottle: {},
          segmentEvents: [],
          subagents: [],
          taskId: 'task-1',
        }),
      ).toBeUndefined();
    });
  });
});
